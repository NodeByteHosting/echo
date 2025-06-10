# Echo Utility Library

This document describes the shared utility functions available for use throughout the application. Using these shared utilities ensures consistent behavior and reduces code duplication.

## Available Utilities

### Cache Management

The `CacheManager` provides efficient caching with metrics:

```javascript
import { responseCache, knowledgeCache, createCache } from '../utils'

// Use predefined caches
responseCache.set('response:query', value)
const cachedValue = knowledgeCache.get('kb:topic')

// Create custom cache
const myCache = createCache({ maxSize: 100, ttl: 60000 })
```

### JSON Handling

Safe JSON utilities to prevent errors:

```javascript
import { safeJsonParse, extractJsonFromText, makeSerializable } from '../utils'

// Safe parsing with fallback
const data = safeJsonParse(text, { fallback: 'value' })

// Extract JSON from text that may contain other content
const jsonData = extractJsonFromText(aiResponse)

// Make objects safe for serialization (handles BigInt, circular refs)
const serializable = makeSerializable(complexObject)
```

### Error Handling

Standardized error handling:

```javascript
import { ErrorType, createErrorResponse, handleProcessingError } from '../utils'

try {
    // Your code
} catch (error) {
    return handleProcessingError(error, context, 'componentName')
}
```

### Promise Utilities

```javascript
import { withTimeout } from '../utils'

// Prevent hanging on slow external services
const result = await withTimeout(apiCall(), 5000, 'API request')
```

## Best Practices

1. **Always use shared utilities** instead of reimplementing common functionality
2. **Import from the index file** (`../utils`) rather than individual utility files
3. **Add metrics and monitoring** for performance-sensitive operations
4. **Handle errors consistently** using the standardized error handlers
5. **Document new utilities** when adding them to the shared library

## Adding New Utilities

When adding new utility functions:

1. Place them in the appropriate file in the `utils` directory
2. Export them in the `utils/index.js` file
3. Add documentation to this file
4. Add unit tests if applicable

## Performance Considerations

-   Use the `memoize` utility for expensive, frequently-called functions with stable inputs
-   Set appropriate TTL values for cached items based on data volatility
-   Consider memory usage when caching large objects
-   Use the built-in metrics to monitor cache performance
