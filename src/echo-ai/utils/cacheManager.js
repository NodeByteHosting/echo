/**
 * Centralized cache management utility for all agents and services
 */
export class CacheManager {
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
        if (Date.now() - item.timestamp > this.ttl) {
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
            ttl: customTtl || this.ttl
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
        if (Date.now() - item.timestamp > this.ttl) {
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
     * Get cache metrics
     * @returns {Object} Current cache metrics
     */
    getMetrics() {
        return {
            size: this.cacheStore.size,
            maxSize: this.maxSize,
            hitRate: this.getTotalRequests() === 0 ? 0 : this.metrics.hits / this.getTotalRequests(),
            evictionRate: this.getTotalRequests() === 0 ? 0 : this.metrics.evictions / this.getTotalRequests(),
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
}

// Create singleton instance with default settings
export const globalCache = new CacheManager()

// Create specialized caches for different use cases
export const responseCache = new CacheManager({
    maxSize: 500,
    ttl: 3600000 // 1 hour
})

export const knowledgeCache = new CacheManager({
    maxSize: 200,
    ttl: 1800000 // 30 minutes
})

export const researchCache = new CacheManager({
    maxSize: 100,
    ttl: 86400000 // 24 hours
})

// Export factory function for creating specialized caches
export function createCache(options) {
    return new CacheManager(options)
}
