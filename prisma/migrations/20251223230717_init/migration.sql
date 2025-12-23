-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPPORT_AGENT', 'MODERATOR', 'DEVELOPER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('CREATE_TICKET', 'VIEW_TICKET', 'CLOSE_TICKET', 'ASSIGN_TICKET', 'MANAGE_TICKETS', 'ESCALATE_TICKET', 'VIEW_ALL_TICKETS', 'BAN_USER', 'UNBAN_USER', 'WARN_USER', 'MANAGE_ROLES', 'VIEW_USER_INFO', 'MANAGE_USER_PROFILE', 'VIEW_KB', 'CREATE_KB', 'EDIT_KB', 'DELETE_KB', 'VERIFY_KB', 'VIEW_SYSTEM_STATUS', 'VIEW_METRICS', 'MANAGE_BOT_SETTINGS', 'PROVIDE_SUPPORT', 'VIEW_SUPPORT_QUEUE', 'MANAGE_SUPPORT_AGENTS', 'DELETE_MESSAGES', 'TIMEOUT_USER', 'VIEW_AUDIT_LOGS', 'MANAGE_THREADS', 'MANAGE_PTERODACTYL', 'VIEW_SERVER_STATUS', 'RESTART_SERVERS', 'MODIFY_SERVER_CONFIG');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'SALE', 'REWARD', 'TRANSFER', 'DAILY', 'WEEKLY', 'WORK');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('BADGE', 'ROLE', 'BACKGROUND', 'COLLECTIBLE', 'CONSUMABLE', 'SPECIAL');

-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('MESSAGES', 'TICKETS', 'HELP', 'MODERATION', 'SPECIAL');

-- CreateEnum
CREATE TYPE "AuditEvent" AS ENUM ('ECHO_EVENTS', 'MESSAGE_EVENTS', 'MEMBER_EVENTS', 'CHANNEL_EVENTS', 'ROLE_EVENTS', 'MOD_EVENTS', 'VOICE_EVENTS', 'THREAD_EVENTS');

-- CreateTable
CREATE TABLE "Echo" (
    "id" TEXT NOT NULL DEFAULT 'echobot',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" BIGINT NOT NULL,

    CONSTRAINT "Echo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EchoModels" (
    "id" TEXT NOT NULL DEFAULT 'echomodels',
    "default" TEXT DEFAULT 'gpt-4o-mini',
    "allowed" TEXT[] DEFAULT ARRAY['gpt-4o-mini', 'gpt-3.5-turbo']::TEXT[],
    "enabled" BOOLEAN DEFAULT true,
    "disabledReason" TEXT NOT NULL,

    CONSTRAINT "EchoModels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EchoPrompts" (
    "id" TEXT NOT NULL DEFAULT 'echoprompts',
    "short" TEXT,
    "system" TEXT,
    "technical" TEXT,

    CONSTRAINT "EchoPrompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EchoPerformance" (
    "id" TEXT NOT NULL DEFAULT 'echooptimization',
    "useCache" BOOLEAN DEFAULT false,
    "cacheTTL" INTEGER DEFAULT 3600,
    "prioritizeSpeed" BOOLEAN DEFAULT true,
    "smartTokenBudgeting" BOOLEAN DEFAULT true,
    "maxConcurrentRequests" BOOLEAN DEFAULT true,
    "responseCacheSize" INTEGER DEFAULT 500,
    "knowledgeCacheTTL" INTEGER DEFAULT 1800,
    "useRateLimit" BOOLEAN DEFAULT false,
    "rateLimitTime" INTEGER DEFAULT 60,
    "dbPoolSize" INTEGER DEFAULT 10,

    CONSTRAINT "EchoPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EchoMaintenance" (
    "id" TEXT NOT NULL DEFAULT 'echomaintenance',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "admin" JSONB,

    CONSTRAINT "EchoMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EchoSettings" (
    "id" TEXT NOT NULL DEFAULT 'echosettings',
    "logLevel" TEXT DEFAULT 'info',
    "logChannel" TEXT,
    "supportGuild" TEXT,
    "supportEmail" TEXT,

    CONSTRAINT "EchoSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EchoBranding" (
    "id" TEXT NOT NULL DEFAULT 'echobranding',
    "logo" TEXT,
    "color" TEXT DEFAULT '#7289DA',
    "footer" TEXT,

    CONSTRAINT "EchoBranding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EchoFeatures" (
    "id" TEXT NOT NULL DEFAULT 'echofeatures',
    "echoAi" BOOLEAN DEFAULT true,
    "msgCmds" BOOLEAN DEFAULT true,
    "slashCmds" BOOLEAN DEFAULT true,
    "tickets" BOOLEAN DEFAULT true,
    "moderation" BOOLEAN DEFAULT true,
    "directMsgs" BOOLEAN DEFAULT true,
    "twitterApi" BOOLEAN DEFAULT false,
    "githubApi" BOOLEAN DEFAULT false,

    CONSTRAINT "EchoFeatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "eventType" "AuditEvent" NOT NULL,
    "actionType" TEXT NOT NULL,
    "performedBy" BIGINT,
    "targetId" TEXT,
    "targetType" TEXT NOT NULL,
    "changes" JSONB,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beta" BOOLEAN DEFAULT false,
    "premium" BOOLEAN DEFAULT false,
    "banned" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildFeatures" (
    "id" TEXT NOT NULL,
    "echoAi" BOOLEAN DEFAULT true,
    "moderation" BOOLEAN DEFAULT false,

    CONSTRAINT "GuildFeatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildGates" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN DEFAULT false,
    "channel" TEXT,
    "logChannel" TEXT,

    CONSTRAINT "GuildGates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildTickets" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN DEFAULT false,
    "categoryId" TEXT,
    "auditId" TEXT,

    CONSTRAINT "GuildTickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildRoles" (
    "id" TEXT NOT NULL,
    "adminRole" TEXT,
    "modRole" TEXT,
    "gatekeeperRole" TEXT,
    "supportRole" TEXT,
    "memberRole" TEXT,

    CONSTRAINT "GuildRoles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildAudits" (
    "id" TEXT NOT NULL,
    "system" BOOLEAN DEFAULT false,
    "tickets" BOOLEAN DEFAULT false,
    "auditEvents" "AuditEvent"[],

    CONSTRAINT "GuildAudits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditChannels" (
    "id" TEXT NOT NULL,
    "system" TEXT,
    "tickets" TEXT,

    CONSTRAINT "AuditChannels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" BIGINT NOT NULL,
    "username" TEXT NOT NULL DEFAULT 'unknown_user',
    "displayName" TEXT DEFAULT 'Unknown User',
    "email" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "permissions" "Permission"[] DEFAULT ARRAY[]::"Permission"[],
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedUntil" TIMESTAMP(3),
    "banReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "userId" BIGINT NOT NULL,
    "assignedTo" BIGINT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "supportAgentId" BIGINT,
    "isEscalated" BOOLEAN NOT NULL DEFAULT false,
    "threadId" TEXT,
    "category" TEXT,
    "resolution" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketFeedback" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "senderId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAgent" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SupportAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "performedBy" BIGINT,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "bio" TEXT,
    "customTitle" TEXT,
    "selectedBadgeId" INTEGER,
    "background" TEXT,
    "accent" TEXT,
    "birthday" TIMESTAMP(3),
    "timezone" TEXT,
    "socials" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Economy" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "bank" INTEGER NOT NULL DEFAULT 0,
    "lastDaily" TIMESTAMP(3),
    "lastWeekly" TIMESTAMP(3),
    "streak" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Economy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "economyId" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "isLimited" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" SERIAL NOT NULL,
    "economyId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "equipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessage" TIMESTAMP(3),

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "AchievementType" NOT NULL,
    "requirement" INTEGER NOT NULL,
    "reward" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Statistics" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "commandsUsed" INTEGER NOT NULL DEFAULT 0,
    "ticketsClosed" INTEGER NOT NULL DEFAULT 0,
    "messagesDeleted" INTEGER NOT NULL DEFAULT 0,
    "usersBanned" INTEGER NOT NULL DEFAULT 0,
    "usersUnbanned" INTEGER NOT NULL DEFAULT 0,
    "warningsGiven" INTEGER NOT NULL DEFAULT 0,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationHistory" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "isAiResponse" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" BIGINT NOT NULL,

    CONSTRAINT "ConversationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBase" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" BIGINT NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BadgeToProfile" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_AchievementToUser" (
    "A" INTEGER NOT NULL,
    "B" BIGINT NOT NULL
);

-- CreateIndex
CREATE INDEX "AuditLog_guildId_idx" ON "AuditLog"("guildId");

-- CreateIndex
CREATE INDEX "AuditLog_eventType_idx" ON "AuditLog"("eventType");

-- CreateIndex
CREATE INDEX "AuditLog_performedBy_idx" ON "AuditLog"("performedBy");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_id_key" ON "Guild"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_key" ON "Guild"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_threadId_key" ON "Ticket"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketFeedback_ticketId_key" ON "TicketFeedback"("ticketId");

-- CreateIndex
CREATE INDEX "Message_ticketId_idx" ON "Message"("ticketId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportAgent_userId_key" ON "SupportAgent"("userId");

-- CreateIndex
CREATE INDEX "ModerationLog_userId_idx" ON "ModerationLog"("userId");

-- CreateIndex
CREATE INDEX "ModerationLog_action_idx" ON "ModerationLog"("action");

-- CreateIndex
CREATE INDEX "ModerationLog_createdAt_idx" ON "ModerationLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Economy_userId_key" ON "Economy"("userId");

-- CreateIndex
CREATE INDEX "Transaction_economyId_idx" ON "Transaction"("economyId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");

-- CreateIndex
CREATE INDEX "Item_type_idx" ON "Item"("type");

-- CreateIndex
CREATE INDEX "Inventory_economyId_idx" ON "Inventory"("economyId");

-- CreateIndex
CREATE INDEX "Inventory_itemId_idx" ON "Inventory"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Level_userId_key" ON "Level"("userId");

-- CreateIndex
CREATE INDEX "Level_userId_idx" ON "Level"("userId");

-- CreateIndex
CREATE INDEX "Level_level_idx" ON "Level"("level");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

-- CreateIndex
CREATE INDEX "Badge_rarity_idx" ON "Badge"("rarity");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_name_key" ON "Achievement"("name");

-- CreateIndex
CREATE INDEX "Achievement_type_idx" ON "Achievement"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Statistics_userId_key" ON "Statistics"("userId");

-- CreateIndex
CREATE INDEX "ConversationHistory_userId_idx" ON "ConversationHistory"("userId");

-- CreateIndex
CREATE INDEX "KnowledgeBase_tags_idx" ON "KnowledgeBase"("tags");

-- CreateIndex
CREATE INDEX "KnowledgeBase_category_idx" ON "KnowledgeBase"("category");

-- CreateIndex
CREATE INDEX "KnowledgeBase_createdBy_idx" ON "KnowledgeBase"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "_BadgeToProfile_AB_unique" ON "_BadgeToProfile"("A", "B");

-- CreateIndex
CREATE INDEX "_BadgeToProfile_B_index" ON "_BadgeToProfile"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AchievementToUser_AB_unique" ON "_AchievementToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_AchievementToUser_B_index" ON "_AchievementToUser"("B");

-- AddForeignKey
ALTER TABLE "Echo" ADD CONSTRAINT "Echo_modelSettings_fkey" FOREIGN KEY ("id") REFERENCES "EchoModels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echo" ADD CONSTRAINT "Echo_maintSettings_fkey" FOREIGN KEY ("id") REFERENCES "EchoMaintenance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echo" ADD CONSTRAINT "Echo_coreSettings_fkey" FOREIGN KEY ("id") REFERENCES "EchoSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echo" ADD CONSTRAINT "Echo_coreBranding_fkey" FOREIGN KEY ("id") REFERENCES "EchoBranding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echo" ADD CONSTRAINT "Echo_coreFeatures_fkey" FOREIGN KEY ("id") REFERENCES "EchoFeatures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildFeatures" ADD CONSTRAINT "GuildFeatures_id_fkey" FOREIGN KEY ("id") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildGates" ADD CONSTRAINT "GuildGates_id_fkey" FOREIGN KEY ("id") REFERENCES "GuildFeatures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildTickets" ADD CONSTRAINT "GuildTickets_id_fkey" FOREIGN KEY ("id") REFERENCES "GuildFeatures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRoles" ADD CONSTRAINT "GuildRoles_id_fkey" FOREIGN KEY ("id") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildAudits" ADD CONSTRAINT "GuildAudits_id_fkey" FOREIGN KEY ("id") REFERENCES "GuildFeatures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditChannels" ADD CONSTRAINT "AuditChannels_id_fkey" FOREIGN KEY ("id") REFERENCES "GuildAudits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "SupportAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_supportAgentId_fkey" FOREIGN KEY ("supportAgentId") REFERENCES "SupportAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketFeedback" ADD CONSTRAINT "TicketFeedback_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAgent" ADD CONSTRAINT "SupportAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_selectedBadgeId_fkey" FOREIGN KEY ("selectedBadgeId") REFERENCES "Badge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Economy" ADD CONSTRAINT "Economy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_economyId_fkey" FOREIGN KEY ("economyId") REFERENCES "Economy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_economyId_fkey" FOREIGN KEY ("economyId") REFERENCES "Economy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statistics" ADD CONSTRAINT "Statistics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationHistory" ADD CONSTRAINT "ConversationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeBase" ADD CONSTRAINT "KnowledgeBase_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BadgeToProfile" ADD CONSTRAINT "_BadgeToProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BadgeToProfile" ADD CONSTRAINT "_BadgeToProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AchievementToUser" ADD CONSTRAINT "_AchievementToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AchievementToUser" ADD CONSTRAINT "_AchievementToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
