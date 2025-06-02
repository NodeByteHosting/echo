# Troubleshooting Guide

This guide covers common issues you might encounter with Echo and their solutions.

## Table of Contents
- [Discord Connection Issues](#discord-connection-issues)
- [Database Errors](#database-errors)
- [AI Response Problems](#ai-response-problems)
- [Circular Reference Errors](#circular-reference-errors)
- [Rate Limiting Issues](#rate-limiting-issues)
- [Memory Management](#memory-management)
- [Performance Optimization](#performance-optimization)

## Discord Connection Issues

### Bot Not Responding

**Symptoms**:
- Bot is online but doesn't respond to mentions
- Discord shows the bot as connected but inactive

**Solutions**:
1. Check if the bot has proper permissions in the channel
2. Verify the bot has the required intents enabled
3. Check the logs for Discord API errors
4. Restart the bot to refresh the connection

```bash
# Check bot status
bun run status

# Restart the bot
bun run restart
```

### Missing Permissions

**Symptoms**:
- Bot responds with permission errors
- Commands fail to execute

**Solutions**:
1. Check the bot's role in server settings
2. Ensure the bot role has the necessary permissions
3. Verify the bot has been properly invited with required scopes
4. Update the role hierarchy if needed

## Database Errors

### Connection Failures

**Symptoms**:
- "Database connection failed" errors
- Commands that require database access fail

**Solutions**:
1. Verify database credentials in the `.env` file
2. Check if PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```
3. Test the database connection:
   ```bash
   npx prisma db push --preview-feature
   ```
4. Check for IP restrictions or firewall issues

### Migration Errors

**Symptoms**:
- "Migration failed" errors during updates
- Schema conflicts

**Solutions**:
1. Check migration history:
   ```bash
   npx prisma migrate status
   ```
2. Resolve conflicts:
   ```bash
   npx prisma migrate resolve --applied "migration_name"
   ```
3. For development environments, reset database:
   ```bash
   npx prisma migrate reset
   ```

### Maximum Call Stack Size Exceeded

**Symptoms**:
- "Maximum call stack size exceeded" error in database operations
- Node.js process crashes when handling complex objects

**Solutions**:
1. Use the serialization utility for complex objects:
   ```javascript
   const safeObject = makeSerializable(complexObject);
   ```
2. Avoid circular references in database queries
3. Limit the depth of recursive functions
4. Use pagination for large datasets

## AI Response Problems

### Timeout Errors

**Symptoms**:
- "Response generation timed out" errors
- Long waiting times for AI responses

**Solutions**:
1. Check OpenAI API status
2. Verify API key and rate limits
3. Optimize prompt length
4. Adjust timeout settings:
   ```javascript
   // Increase timeout for complex queries
   const response = await withTimeout(
       responsePromise,
       120000, // 2 minutes
       'Response timed out. Please try again with a simpler query.'
   );
   ```

### Inaccurate Responses

**Symptoms**:
- AI provides incorrect information
- Responses are unrelated to the query

**Solutions**:
1. Review and update the knowledge base
2. Check system prompt configuration
3. Implement a feedback mechanism for users to report issues
4. Adjust temperature setting for more deterministic responses:
   ```javascript
   // Lower temperature for more focused responses
   temperature: 0.3
   ```

## Circular Reference Errors

**Symptoms**:
- "Converting circular structure to JSON" errors
- Maximum call stack size exceeded when stringifying objects

**Solutions**:
1. Use the serialization utility:
   ```javascript
   import { makeSerializable } from '../utils/serialization.js';
   
   // Before passing to JSON.stringify or to the AI model
   const safeObject = makeSerializable(complexObject);
   ```
2. Restructure objects to avoid circular references
3. Use getters/setters instead of direct circular references
4. Implement custom toJSON methods for complex classes

## Rate Limiting Issues

**Symptoms**:
- "Rate limit exceeded" errors
- API calls being rejected

**Solutions**:
1. Implement proper caching to reduce API calls
2. Use exponential backoff for retries:
   ```javascript
   async function fetchWithRetry(fn, maxRetries = 3) {
       let retries = 0;
       while (retries < maxRetries) {
           try {
               return await fn();
           } catch (error) {
               if (error.message.includes('rate limit')) {
                   retries++;
                   await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
               } else {
                   throw error;
               }
           }
       }
       throw new Error('Max retries exceeded');
   }
   ```
3. Batch related operations instead of making many individual calls
4. Implement proper queuing for high-volume operations

## Memory Management

**Symptoms**:
- Increasing memory usage over time
- Out of memory errors

**Solutions**:
1. Implement proper cleanup of large objects:
   ```javascript
   // Clear large caches periodically
   setInterval(() => {
       this.responseCache.clear();
   }, 3600000); // Every hour
   ```
2. Use WeakMap/WeakSet for caches that reference objects
3. Monitor memory usage and implement auto-scaling if needed:
   ```javascript
   const memoryUsage = process.memoryUsage();
   if (memoryUsage.heapUsed > 1024 * 1024 * 500) { // 500MB
       // Clear caches or take other memory-saving actions
   }
   ```
4. Limit the size of response payloads

## Performance Optimization

**Symptoms**:
- Slow response times
- High CPU usage

**Solutions**:
1. Implement caching for frequently accessed data
2. Use memoization for expensive computations:
   ```javascript
   import { memoize } from '../utils/performanceOptimizer.js';
   
   // Memoize expensive functions
   this.expensiveOperation = memoize(this._expensiveImplementation.bind(this));
   ```
3. Optimize database queries with proper indexes
4. Use pagination for large datasets
5. Implement background processing for non-critical tasks:
   ```javascript
   // Process in background
   setTimeout(() => {
       this._performBackgroundTask().catch(err => console.error(err));
   }, 0);
   ```
