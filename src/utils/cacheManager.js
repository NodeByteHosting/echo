/**
 * Centralized cache management utility for all components
 */

/**
 * Cache manager for efficient data storage and retrieval
 */
export class CacheManager {
    /**
     * Create a new cache manager
     * @param {Object} options - Cache options
     * @param {number} [options.maxSize=500] - Maximum cache size
     * @param {number} [options.ttl=3600000] - Default TTL in ms (1 hour)
     */
    constructor(options = {}) {
        this.maxSize = options.maxSize || 500
        this.ttl = options.ttl || 3600000 // Default: 1 hour
        this.cacheStore = new Map()
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0
        }
    }

    /**
     * Get an item from cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null if not found/expired
     */
    get(key) {
        const item = this.cacheStore.get(key)

        if (!item) {
            this.metrics.misses++
            return null
        }

        // Check if item has expired
        if (Date.now() - item.timestamp > (item.ttl || this.ttl)) {
            this.cacheStore.delete(key)
            this.metrics.misses++
            return null
        }

        this.metrics.hits++
        return item.value
    }

    /**
     * Set an item in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} [customTtl] - Optional custom TTL for this item
     */
    set(key, value, customTtl = null) {
        // Enforce cache size limits
        if (this.cacheStore.size >= this.maxSize) {
            // Remove oldest entry
            const oldestKey = [...this.cacheStore.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0]

            this.cacheStore.delete(oldestKey)
            this.metrics.evictions++
        }

        this.cacheStore.set(key, {
            value,
            timestamp: Date.now(),
            ttl: customTtl
        })
    }

    /**
     * Generate a standardized cache key
     * @param {string} type - Type of data (e.g., 'response', 'knowledge', 'research')
     * @param {string} content - Content to derive key from
     * @returns {string} Normalized cache key
     */
    generateKey(type, content) {
        // Normalize content by trimming, lowercasing, and removing extra spaces
        const normalized = content.trim().toLowerCase().replace(/\s+/g, ' ')

        // Create a stable key from the normalized content (limit length)
        return `${type}:${normalized.substring(0, 100)}`
    }

    /**
     * Check if key exists in cache and is not expired
     * @param {string} key - Cache key to check
     * @returns {boolean} Whether key exists and is valid
     */
    has(key) {
        const item = this.cacheStore.get(key)
        if (!item) {
            return false
        }

        // Check expiration
        if (Date.now() - item.timestamp > (item.ttl || this.ttl)) {
            this.cacheStore.delete(key)
            return false
        }

        return true
    }

    /**
     * Delete an item from cache
     * @param {string} key - Cache key to delete
     * @returns {boolean} Whether the item was found and deleted
     */
    delete(key) {
        return this.cacheStore.delete(key)
    }

    /**
     * Clear all cached items
     */
    clear() {
        this.cacheStore.clear()
    }

    /**
     * Reset metrics counters
     */
    resetMetrics() {
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0
        }
    }

    /**
     * Get cache metrics
     * @returns {Object} Current cache metrics
     */
    getMetrics() {
        const totalRequests = this.metrics.hits + this.metrics.misses

        return {
            size: this.cacheStore.size,
            maxSize: this.maxSize,
            hitRate: totalRequests === 0 ? 0 : this.metrics.hits / totalRequests,
            evictionRate: totalRequests === 0 ? 0 : this.metrics.evictions / totalRequests,
            ...this.metrics
        }
    }

    /**
     * Get total number of requests (hits + misses)
     * @returns {number} Total requests
     */
    getTotalRequests() {
        return this.metrics.hits + this.metrics.misses
    }

    /**
     * Get cache statistics for monitoring
     * @returns {Object} Detailed cache statistics
     */
    getDetailedStats() {
        return {
            size: this.cacheStore.size,
            maxSize: this.maxSize,
            ttl: this.ttl,
            hitRate: this.getTotalRequests() === 0 ? 0 : this.metrics.hits / this.getTotalRequests(),
            evictionRate: this.getTotalRequests() === 0 ? 0 : this.metrics.evictions / this.getTotalRequests(),
            metrics: { ...this.metrics },
            oldestEntry: this._getOldestEntryAge(),
            newestEntry: this._getNewestEntryAge(),
            keyTypes: this._analyzeKeyTypes()
        }
    }

    /**
     * Get age of oldest cache entry in seconds
     * @private
     */
    _getOldestEntryAge() {
        if (this.cacheStore.size === 0) {
            return null
        }

        const oldest = [...this.cacheStore.entries()].reduce(
            (oldest, [_, entry]) => {
                return entry.timestamp < oldest.timestamp ? entry : oldest
            },
            { timestamp: Date.now() }
        )

        return Math.floor((Date.now() - oldest.timestamp) / 1000)
    }

    /**
     * Get age of newest cache entry in seconds
     * @private
     */
    _getNewestEntryAge() {
        if (this.cacheStore.size === 0) {
            return null
        }

        const newest = [...this.cacheStore.entries()].reduce(
            (newest, [_, entry]) => {
                return entry.timestamp > newest.timestamp ? entry : newest
            },
            { timestamp: 0 }
        )

        return Math.floor((Date.now() - newest.timestamp) / 1000)
    }

    /**
     * Analyze key types in the cache
     * @private
     */
    _analyzeKeyTypes() {
        const types = {}

        for (const key of this.cacheStore.keys()) {
            const typeMatch = key.match(/^([^:]+):/)
            const type = typeMatch ? typeMatch[1] : 'unknown'
            types[type] = (types[type] || 0) + 1
        }

        return types
    }
}

/**
 * Create a new cache manager instance with custom settings
 * @param {Object} options - Cache configuration options
 * @returns {CacheManager} New cache manager instance
 */
export function createCache(options = {}) {
    return new CacheManager(options)
}

// Global cache for general-purpose use
export const globalCache = new CacheManager({
    maxSize: 1000,
    ttl: 7200000 // 2 hours
})

// Response cache for API responses
export const responseCache = new CacheManager({
    maxSize: 500,
    ttl: 1800000 // 30 minutes
})

// Knowledge cache for knowledge base queries
export const knowledgeCache = new CacheManager({
    maxSize: 300,
    ttl: 3600000 // 1 hour
})

// Research cache for research agent results
export const researchCache = new CacheManager({
    maxSize: 200,
    ttl: 2700000 // 45 minutes
})
