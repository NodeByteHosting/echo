# Knowledge Base System

Echo's knowledge base system allows storing, retrieving, and managing information that can be used to answer user queries. This document explains how the knowledge base works and how to interact with it.

## Overview

The knowledge base is built on:
- PostgreSQL database storage via Prisma
- KnowledgeAgent for intelligent retrieval
- AI-powered synthesis of information
- User contribution system

## Database Structure

The knowledge base is stored in the `KnowledgeBase` table with the following structure:

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

## Adding to the Knowledge Base

### User Contributions

Users can add to the knowledge base by replying with:

```
Save this as: [Title]
```

The system will:
1. Extract the title
2. Use AI to categorize and tag the content
3. Store the entry in the database
4. Mark it as unverified until moderator approval

### Via API

Entries can be programmatically added:

```javascript
await knowledgeAgent.saveEntry(
    "Title",
    "Content",
    "category",
    ["tag1", "tag2"],
    userId
);
```

## Retrieving Information

The knowledge agent retrieves information using:
1. Topic extraction from user queries
2. Semantic search on knowledge entries
3. AI synthesis of retrieved information

### Query Process

1. User asks a question
2. System analyzes the query to identify main topics
3. Database is searched for relevant entries
4. Retrieved entries are synthesized into a coherent response
5. If insufficient information is found, research is requested

## Verification System

Knowledge entries go through a verification process:

1. User submits an entry (unverified)
2. Moderator reviews the entry
3. If approved, entry is marked as verified
4. Verified entries are prioritized in searches

```javascript
await knowledgeAgent.verifyEntry(entryId, moderatorId);
```

## Rating System

Users can rate knowledge entries to improve quality:

```javascript
await knowledgeAgent.rateEntry(entryId, rating, userId);
```

Ratings are used to:
- Prioritize high-quality content
- Identify entries that need improvement
- Provide feedback to contributors

## Performance Optimization

The knowledge base implements several optimizations:

1. **Caching**: Frequently accessed entries are cached
2. **Rate Limiting**: Prevents abuse of the system
3. **Memoization**: Reduces redundant computations
4. **Indexing**: Database indexes for fast retrieval

## Categories

Standard categories include:
- general
- technical
- faq
- tutorial
- policy
- guide

## Usage in Discord

The knowledge base integrates with Discord through:

1. Question detection
2. Answer synthesis
3. Save suggestions for valuable information
4. Rating prompts

## Best Practices

1. **Content Quality**:
   - Be clear and concise
   - Include code examples where relevant
   - Use proper formatting
   - Cite sources when applicable

2. **Organization**:
   - Use descriptive titles
   - Apply relevant tags
   - Choose the appropriate category
   - Break complex topics into smaller entries

3. **Maintenance**:
   - Regularly review and update entries
   - Remove outdated information
   - Merge duplicate entries
   - Improve low-rated entries
