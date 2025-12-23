-- Fix duplicate threadId values before adding unique constraint
-- This migration handles existing duplicate threadId values

-- Step 1: Remove duplicate threadIds by keeping only the oldest ticket for each threadId
WITH duplicates AS (
  SELECT id, threadId, 
         ROW_NUMBER() OVER (PARTITION BY threadId ORDER BY createdAt ASC) as rn
  FROM "Ticket"
  WHERE threadId IS NOT NULL
)
UPDATE "Ticket"
SET threadId = NULL
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Now we can safely add the unique constraint
-- This should match your schema.prisma file
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_threadId_key" UNIQUE ("threadId");
