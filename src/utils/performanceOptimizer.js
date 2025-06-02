/**
 * Utility functions to optimize performance across the application
 */

// Cache for optimization
const optimizationCache = new Map()

/**
 * Memoizes a function to improve performance for repeated calls
 * @param {Function} fn - The function to memoize
 * @param {Object} options - Memoization options
 * @param {number} options.maxSize - Maximum cache size (default: 100)
 * @param {number} options.ttl - Time to live in ms (default: 5 minutes)
 * @returns {Function} - Memoized function
 */
export function memoize(fn, options = {}) {
    const cache = new Map()
    const maxSize = options.maxSize || 100
    const ttl = options.ttl || 5 * 60 * 1000 // 5 minutes default

    return async function (...args) {
        // Create a cache key from the arguments
        const key = JSON.stringify(args)

        // Check if we have a cached result
        if (cache.has(key)) {
            const { result, timestamp } = cache.get(key)

            // Check if the cache entry is still valid
            if (Date.now() - timestamp < ttl) {
                return result
            }

            // Remove expired entry
            cache.delete(key)
        }

        // Limit cache size by removing oldest entries
        if (cache.size >= maxSize) {
            const oldestKey = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0]
            cache.delete(oldestKey)
        }

        // Call the original function
        const result = await fn(...args)

        // Cache the result
        cache.set(key, {
            result,
            timestamp: Date.now()
        })

        return result
    }
}

/**
 * Run a function with a timeout
 * @param {Function} fn - Function to run
 * @param {number} timeout - Timeout in ms
 * @param {any} defaultValue - Default value if timeout occurs
 * @returns {Promise<any>} Function result or default value
 */
export async function withTimeout(fn, timeout, defaultValue) {
    let timeoutId

    const timeoutPromise = new Promise(resolve => {
        timeoutId = setTimeout(() => {
            resolve(defaultValue)
        }, timeout)
    })

    try {
        const result = await Promise.race([fn(), timeoutPromise])
        clearTimeout(timeoutId)
        return result
    } catch (error) {
        clearTimeout(timeoutId)
        throw error
    }
}

/**
 * Run multiple promises concurrently with a limit
 * @param {Array<Function>} tasks - Array of functions that return promises
 * @param {number} concurrency - Max concurrent tasks
 * @returns {Promise<Array<any>>} Results array
 */
export async function concurrentLimit(tasks, concurrency = 3) {
    const results = []
    const executing = []

    for (const [index, task] of tasks.entries()) {
        const p = Promise.resolve().then(() => task())
        results[index] = p

        if (concurrency <= tasks.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1))
            executing.push(e)
            if (executing.length >= concurrency) {
                await Promise.race(executing)
            }
        }
    }

    return Promise.all(results)
}

/**
 * Optimize a database query by adding timeout and retry logic
 * @param {Function} queryFn - Database query function
 * @param {Object} options - Options for optimization
 * @returns {Promise<any>} Query result
 */
export async function optimizeDbQuery(queryFn, options = {}) {
    const { timeout = 5000, retries = 2, fallback = null } = options

    let lastError

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await withTimeout(queryFn, timeout, fallback)
        } catch (error) {
            lastError = error
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)))
            }
        }
    }

    console.error('Database query failed after retries:', lastError)
    return fallback
}

/**
 * Debounces a function call
 * @param {Function} fn - The function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function} - Debounced function
 */
export function debounce(fn, delay) {
    let timer = null

    return function (...args) {
        const context = this

        if (timer) {
            clearTimeout(timer)
        }

        timer = setTimeout(() => {
            fn.apply(context, args)
            timer = null
        }, delay)
    }
}

/**
 * Throttles a function call
 * @param {Function} fn - The function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} - Throttled function
 */
export function throttle(fn, limit) {
    let lastCall = 0
    let waiting = false
    let lastArgs = null

    return function (...args) {
        const context = this
        const now = Date.now()

        if (now - lastCall >= limit) {
            lastCall = now
            fn.apply(context, args)
        } else if (!waiting) {
            waiting = true
            lastArgs = args

            setTimeout(
                () => {
                    waiting = false
                    lastCall = Date.now()
                    fn.apply(context, lastArgs)
                },
                limit - (now - lastCall)
            )
        }
    }
}

/**
 * Runs tasks in a queue to limit concurrency
 */
export class TaskQueue {
    constructor(concurrency = 2) {
        this.concurrency = concurrency
        this.running = 0
        this.queue = []
    }

    /**
     * Add a task to the queue
     * @param {Function} task - Async function to execute
     * @returns {Promise} - Promise that resolves when the task completes
     */
    enqueue(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject })
            this._next()
        })
    }

    /**
     * Process the next task in the queue
     * @private
     */
    _next() {
        if (this.running >= this.concurrency || this.queue.length === 0) {
            return
        }

        const { task, resolve, reject } = this.queue.shift()
        this.running++

        Promise.resolve(task())
            .then(resolve)
            .catch(reject)
            .finally(() => {
                this.running--
                this._next()
            })
    }
}
