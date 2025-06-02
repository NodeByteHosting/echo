/**
 * Utility for handling serialization of complex objects to prevent
 * "Maximum call stack size exceeded" errors from circular references
 */

/**
 * Makes an object safe for serialization by handling circular references
 * and non-serializable values
 * @param {Object} obj - The object to make serializable
 * @param {Object} options - Options for serialization
 * @returns {Object} A serializable copy of the object
 */
export function makeSerializable(obj, options = {}) {
    if (!obj) {
        return obj
    }

    const defaults = {
        maxDepth: 10,
        replaceCircular: '[Circular Reference]',
        replaceFunction: '[Function]',
        replaceSymbol: '[Symbol]',
        replaceBigInt: val => Number(val),
        replaceBinary: '[Binary Data]',
        replaceError: err => ({ name: err.name, message: err.message }),
        replaceDate: date => date.toISOString(),
        safeTypes: ['string', 'number', 'boolean', 'undefined']
    }

    const config = { ...defaults, ...options }
    const seen = new WeakSet()

    function serialize(value, depth = 0) {
        // Handle null immediately
        if (value === null) {
            return null
        }

        // Handle primitive types that are safe for serialization
        const type = typeof value
        if (config.safeTypes.includes(type)) {
            return value
        }

        // Prevent infinite recursion
        if (depth > config.maxDepth) {
            return '[Max Depth Exceeded]'
        }

        // Handle circular references
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return config.replaceCircular
            }
            seen.add(value)
        }

        // Handle specific types
        if (typeof value === 'function') {
            return config.replaceFunction
        }

        if (typeof value === 'symbol') {
            return config.replaceSymbol
        }

        if (typeof value === 'bigint') {
            return config.replaceBigInt(value)
        }

        if (value instanceof Date) {
            return config.replaceDate(value)
        }

        if (value instanceof Error) {
            return config.replaceError(value)
        }

        if (value instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(value))) {
            return config.replaceBinary
        }

        // Handle arrays
        if (Array.isArray(value)) {
            return value.map(item => serialize(item, depth + 1))
        }

        // Handle plain objects
        if (Object.getPrototypeOf(value) === Object.prototype) {
            const result = {}
            for (const [key, val] of Object.entries(value)) {
                try {
                    result[key] = serialize(val, depth + 1)
                } catch (error) {
                    result[key] = `[Unserializable: ${typeof val}]`
                }
            }
            return result
        }

        // Handle class instances by getting their properties
        try {
            const result = {}
            for (const key of Object.keys(value)) {
                try {
                    result[key] = serialize(value[key], depth + 1)
                } catch (error) {
                    result[key] = `[Unserializable: ${typeof value[key]}]`
                }
            }
            return result
        } catch (error) {
            return `[Unserializable Object: ${value.constructor?.name || typeof value}]`
        }
    }

    return serialize(obj)
}

/**
 * Safely stringify an object for logging or transmission
 * @param {Object} obj - The object to stringify
 * @returns {string} Safe JSON string
 */
export function safeStringify(obj) {
    return JSON.stringify(makeSerializable(obj))
}

/**
 * Deep clone an object without circular references
 * @param {Object} obj - The object to clone
 * @returns {Object} A deep clone of the object
 */
export function safeClone(obj) {
    return makeSerializable(obj)
}
