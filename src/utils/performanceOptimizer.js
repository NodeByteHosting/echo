/**
 * Performance optimization utilities for the Echo codebase
 */

/**
 * Cache for memoized functions
 * @private
 */
const memoizationCache = new Map()

/**
 * Memoizes a function to cache results and improve performance
 * @param {Function} fn - Function to memoize
 * @param {Function} [keyFn] - Optional function to generate cache key
 * @param {Object} [options] - Cache options
 * @param {number} [options.maxSize=100] - Maximum cache size
 * @param {number} [options.ttl=3600000] - Time to live in ms (1 hour default)
 * @returns {Function} Memoized function
 */
export function memoize(fn, keyFn, options = {}) {
    const maxSize = options.maxSize || 100
    const ttl = options.ttl || 3600000 // 1 hour

    // Generate unique cache ID for this function
    const fnId = fn.name || Math.random().toString(36).substring(2, 9)

    // Create cache for this function if it doesn't exist
    if (!memoizationCache.has(fnId)) {
        memoizationCache.set(fnId, new Map())
    }

    const cache = memoizationCache.get(fnId)

    return function (...args) {
        // Generate cache key
        const key = keyFn ? keyFn(...args) : JSON.stringify(args)

        // Check if cached result exists and is not expired
        if (cache.has(key)) {
            const entry = cache.get(key)
            if (Date.now() - entry.timestamp < ttl) {
                return entry.value
            }
            // Remove expired entry
            cache.delete(key)
        }

        // Enforce cache size limit
        if (cache.size >= maxSize) {
            // Remove oldest entry
            const oldestKey = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0]
            cache.delete(oldestKey)
        }

        // Call original function and cache result
        const result = fn(...args)

        // Handle promises
        if (result instanceof Promise) {
            return result.then(value => {
                cache.set(key, { value, timestamp: Date.now() })
                return value
            })
        }

        // Cache the result
        cache.set(key, { value: result, timestamp: Date.now() })
        return result
    }
}

/**
 * Creates a rate limiter function
 * @param {Object} options - Rate limiter options
 * @param {number} options.maxRequests - Maximum requests allowed in the time window
 * @param {number} options.window - Time window in milliseconds
 * @returns {Function} Rate limiter function that returns true if request is allowed
 */
export function createRateLimiter(options) {
    const { maxRequests, window } = options
    const requests = new Map()

    return function (key) {
        const now = Date.now()

        if (!requests.has(key)) {
            requests.set(key, [])
        }

        // Get current request timestamps and filter expired ones
        const timestamps = requests.get(key).filter(time => now - time < window)

        // Check if rate limit is exceeded
        if (timestamps.length >= maxRequests) {
            return false
        }

        // Record this request
        timestamps.push(now)
        requests.set(key, timestamps)

        return true
    }
}

/**
 * Execute a function with timeout protection
 * @param {Promise} promise - The promise to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} [errorMessage] - Custom error message
 * @returns {Promise} Promise with timeout protection
 */
export async function withTimeout(promise, timeoutMs = 10000, errorMessage = 'Operation timed out') {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    })

    return Promise.race([promise, timeoutPromise])
}

/**
 * Batch processor for optimizing multiple operations
 * @param {Function} processFn - Function to process each item
 * @param {Array} items - Items to process
 * @param {Object} options - Batch options
 * @param {number} [options.batchSize=10] - Size of each batch
 * @param {number} [options.delay=0] - Delay between batches in ms
 * @returns {Promise<Array>} Results from all operations
 */
export async function processBatch(processFn, items, options = {}) {
    const batchSize = options.batchSize || 10
    const delay = options.delay || 0

    const results = []

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)

        // Process batch concurrently
        const batchResults = await Promise.all(batch.map(item => processFn(item)))

        results.push(...batchResults)

        // Add delay between batches if specified
        if (delay > 0 && i + batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }

    return results
}
