# Database Schema Documentation

This document describes the database schema used in the Echo bot system. The schema is implemented using Prisma and PostgreSQL.

## Enums

### UserRole
```prisma
enum UserRole {
    USER
    SUPPORT_AGENT
    MODERATOR
    DEVELOPER
    ADMIN
}
```

### TicketStatus
```prisma
enum TicketStatus {
    OPEN
    IN_PROGRESS
    RESOLVED
    CLOSED
    ESCALATED
}
```

### Permission
```prisma
enum Permission {
    // Ticket System
    CREATE_TICKET
    VIEW_TICKET
    CLOSE_TICKET
    ASSIGN_TICKET
    MANAGE_TICKETS
    ESCALATE_TICKET
    VIEW_ALL_TICKETS

    // User Management
    BAN_USER
    UNBAN_USER
    WARN_USER
    MANAGE_ROLES
    VIEW_USER_INFO
    MANAGE_USER_PROFILE

    // Knowledge Base
    VIEW_KB
    CREATE_KB
    EDIT_KB
    DELETE_KB
    VERIFY_KB

    // System Commands
    VIEW_SYSTEM_STATUS
    VIEW_METRICS
    MANAGE_BOT_SETTINGS

    // Support System
    PROVIDE_SUPPORT
    VIEW_SUPPORT_QUEUE
    MANAGE_SUPPORT_AGENTS

    // Moderation
    DELETE_MESSAGES
    TIMEOUT_USER
    VIEW_AUDIT_LOGS
    MANAGE_THREADS

    // Server Management
    MANAGE_PTERODACTYL
    VIEW_SERVER_STATUS
    RESTART_SERVERS
    MODIFY_SERVER_CONFIG
}
```

### Transaction and Item Types
```prisma
enum TransactionType {
    PURCHASE
    SALE
    REWARD
    TRANSFER
    DAILY
    WEEKLY
    WORK
}

enum ItemType {
    BADGE
    ROLE
    BACKGROUND
    COLLECTIBLE
    CONSUMABLE
    SPECIAL
}

enum AchievementType {
    MESSAGES
    TICKETS
    HELP
    MODERATION
    SPECIAL
}

enum AuditEvent {
    MESSAGE_EVENTS
    MEMBER_EVENTS
    CHANNEL_EVENTS
    ROLE_EVENTS
    MOD_EVENTS
    VOICE_EVENTS
    THREAD_EVENTS
}
```

## Core Models

### User
The central model representing a Discord user in the system.
```prisma
model User {
    id                  BigInt                @id
    username            String                @unique
    email               String?               @unique
    role                UserRole              @default(USER)
    permissions         Permission[]          @default([])
    isBanned            Boolean               @default(false)
    bannedUntil         DateTime?
    banReason           String?
    createdAt           DateTime              @default(now())
    updatedAt           DateTime              @updatedAt

    // Relations
    tickets             Ticket[]              @relation("UserTickets")
    messages            Message[]             @relation("UserMessages")
    SupportAgent        SupportAgent?
    moderationReceived  ModerationLog[]       @relation("ModeratedUser")
    moderationPerformed ModerationLog[]       @relation("ModeratorUser")
    profile             Profile?
    economy            Economy?
    level              Level?
    statistics         Statistics?
    achievements       Achievement[]
    conversations      ConversationHistory[]
    knowledgeEntries   KnowledgeBase[]
}
```

### Support System Models

#### Ticket
Represents a support ticket in the system.
```prisma
model Ticket {
    id             Int           @id @default(autoincrement())
    title          String
    description    String
    status         TicketStatus  @default(OPEN)
    priority       Int           @default(1)
    isEscalated    Boolean       @default(false)
    createdAt      DateTime      @default(now())
    updatedAt      DateTime      @updatedAt
    closedAt       DateTime?

    // Relations
    userId         BigInt
    user           User          @relation("UserTickets", fields: [userId], references: [id])
    messages       Message[]      @relation("TicketMessages")
    assignedTo     BigInt?
    assignedAgent  SupportAgent? @relation("AssignedAgentToTicket", fields: [assignedTo], references: [id])
}
```

#### Message
Messages within support tickets.
```prisma
model Message {
    id         Int      @id @default(autoincrement())
    content    String
    isInternal Boolean  @default(false)
    createdAt  DateTime @default(now())

    // Relations
    ticketId   Int
    ticket     Ticket   @relation("TicketMessages", fields: [ticketId], references: [id])
    senderId   BigInt
    sender     User     @relation("UserMessages", fields: [senderId], references: [id])
}
```

#### SupportAgent
Represents users who can handle support tickets.
```prisma
model SupportAgent {
    id        BigInt   @id
    userId    BigInt   @unique
    user      User     @relation(fields: [userId], references: [id])
    tickets   Ticket[] @relation("AssignedAgentToTicket")
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    isActive  Boolean  @default(true)
    Ticket    Ticket[] @relation("SupportAgentToTicket")
}
```

### User Profile and Progress

#### Profile
User profile information and customization.
```prisma
model Profile {
    id              Int       @id @default(autoincrement())
    userId          BigInt    @unique
    user            User      @relation(fields: [userId], references: [id])
    bio             String?   @db.Text
    customTitle     String?
    badges          Badge[]
    selectedBadge   Badge?    @relation("SelectedBadge", fields: [selectedBadgeId], references: [id])
    selectedBadgeId Int?
    background      String?
    accent          String?
    birthday        DateTime?
    timezone        String?
    socials         Json?
    settings        Json?
    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt
}
```

#### Level
User progression system.
```prisma
model Level {
    id           Int       @id @default(autoincrement())
    userId       BigInt    @unique
    user         User      @relation(fields: [userId], references: [id])
    level        Int       @default(1)
    xp           Int       @default(0)
    totalXp      Int       @default(0)
    messageCount Int       @default(0)
    lastMessage  DateTime?
}
```

#### Achievement
User achievements and rewards.
```prisma
model Achievement {
    id          Int             @id @default(autoincrement())
    name        String          @unique
    description String          @db.Text
    type        AchievementType
    requirement Int
    reward      Int
    icon        String
    users       User[]
}
```

### Economy System

#### Economy
User's economic data.
```prisma
model Economy {
    id           Int           @id @default(autoincrement())
    userId       BigInt        @unique
    user         User          @relation(fields: [userId], references: [id])
    balance      Int           @default(0)
    bank         Int           @default(0)
    inventory    Inventory[]
    transactions Transaction[]
    lastDaily    DateTime?
    lastWeekly   DateTime?
    streak       Int           @default(0)
}
```

#### Transaction
Economic transaction history.
```prisma
model Transaction {
    id          Int             @id @default(autoincrement())
    economyId   Int
    economy     Economy         @relation(fields: [economyId], references: [id])
    type        TransactionType
    amount      Int
    description String?
    createdAt   DateTime        @default(now())
}
```

#### Item and Inventory
Items that users can own.
```prisma
model Item {
    id          Int         @id @default(autoincrement())
    name        String      @unique
    type        ItemType
    description String?     @db.Text
    price       Int
    isLimited   Boolean     @default(false)
    quantity    Int?
    inventory   Inventory[]
}

model Inventory {
    id        Int     @id @default(autoincrement())
    economyId Int
    economy   Economy @relation(fields: [economyId], references: [id])
    itemId    Int
    item      Item    @relation(fields: [itemId], references: [id])
    quantity  Int     @default(1)
    equipped  Boolean @default(false)
}
```

### Knowledge Base

#### KnowledgeBase
Community knowledge base entries.
```prisma
model KnowledgeBase {
    id          Int      @id @default(autoincrement())
    title       String   @db.Text
    content     String   @db.Text
    category    String?
    tags        String[]
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
    createdBy   BigInt
    user        User     @relation(fields: [createdBy], references: [id])
    useCount    Int      @default(0)
    rating      Float    @default(0)
    ratingCount Int      @default(0)
    isVerified  Boolean  @default(false)

    @@index([tags])
    @@index([category])
    @@index([createdBy])
}
```

### Analytics and Logging

#### Statistics
User activity statistics.
```prisma
model Statistics {
    id              Int      @id @default(autoincrement())
    userId          BigInt   @unique
    user            User     @relation(fields: [userId], references: [id])
    commandsUsed    Int      @default(0)
    ticketsClosed   Int      @default(0)
    messagesDeleted Int      @default(0)
    usersBanned     Int      @default(0)
    usersUnbanned   Int      @default(0)
    warningsGiven   Int      @default(0)
    lastActive      DateTime @default(now())
}
```

#### ModerationLog
Moderation action history.
```prisma
model ModerationLog {
    id          Int       @id @default(autoincrement())
    userId      BigInt
    targetUser  User      @relation("ModeratedUser", fields: [userId], references: [id])
    action      String
    reason      String
    createdAt   DateTime  @default(now())
    expiresAt   DateTime?
    performedBy BigInt?
    moderator   User?     @relation("ModeratorUser", fields: [performedBy], references: [id])
}
```

#### AuditLog
Server event audit logs.
```prisma
model AuditLog {
    id          BigInt     @id @default(autoincrement())
    guildId     String
    eventType   AuditEvent
    actionType  String
    performedBy BigInt?
    targetId    String?
    targetType  String
    changes     Json?
    details     String?    @db.Text
    createdAt   DateTime   @default(now())

    @@index([guildId])
    @@index([eventType])
    @@index([performedBy])
    @@index([createdAt])
}
```

### Server Configuration

#### GuildConfig
Discord server configuration.
```prisma
model GuildConfig {
    id                 String       @id
    name               String
    logChannelId       String?
    modLogChannelId    String?
    supportCategoryId  String?
    ticketLogChannelId String?
    welcomeChannelId   String?
    modRoleId          String?
    adminRoleId        String?
    supportRoleId      String?
    auditEvents        AuditEvent[]
    createdAt          DateTime     @default(now())
    updatedAt          DateTime     @updatedAt
}
```

## Schema Management

To update the database schema:

1. Make changes to `prisma/schema.prisma`
2. Run migrations:
   ```bash
   npx prisma migrate dev --name <migration-name>
   ```
3. Update generated types:
   ```bash
   npx prisma generate
   ```

## Indexes and Performance

The schema includes several strategic indexes:
- User lookups: username, email
- Knowledge base: tags, category, createdBy
- Audit logs: guildId, eventType, performedBy, createdAt
- Relationships: Most foreign keys are indexed by default

## Schema Conventions

- IDs for Discord-related entities use `BigInt` (for Discord Snowflakes)
- Other IDs use auto-incrementing `Int`
- Timestamps use `DateTime`
- Long text fields use `@db.Text`
- JSON fields for flexible data storage
- Explicit relation naming for clarity
