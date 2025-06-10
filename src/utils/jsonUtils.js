/**
 * Utility functions for safe JSON handling throughout the application
 */

/**
 * Safely parse JSON with error handling
 * @param {string} text - Text that may contain JSON
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} Parsed JSON or fallback
 */
export function safeJsonParse(text, fallback = null) {
    try {
        // Try to find JSON object in text
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        const jsonString = jsonMatch ? jsonMatch[0] : text

        return JSON.parse(jsonString)
    } catch (error) {
        console.error('JSON Parse error:', error)
        return typeof fallback === 'function' ? fallback() : fallback
    }
}

/**
 * Extract JSON from text that might contain explanations or other content
 * @param {string} text - Text that may contain JSON
 * @returns {any|null} Extracted JSON or null if not found
 */
export function extractJsonFromText(text) {
    try {
        // Try to find JSON in code blocks first
        const jsonBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/
        const blockMatch = text.match(jsonBlockRegex)

        if (blockMatch && blockMatch[1]) {
            return JSON.parse(blockMatch[1].trim())
        }

        // Try to find standalone JSON object
        const jsonObjectRegex = /\{[\s\S]*?\}/
        const objectMatch = text.match(jsonObjectRegex)

        if (objectMatch) {
            return JSON.parse(objectMatch[0])
        }

        // No valid JSON found
        return null
    } catch (error) {
        console.error('Error extracting JSON from text:', error)
        return null
    }
}

/**
 * Makes an object safe for JSON serialization
 * Handles BigInt, circular references, and non-serializable values
 * @param {any} obj - Object to make serializable
 * @returns {any} Serializable version of the object
 */
export function makeSerializable(obj) {
    if (!obj) {
        return obj
    }

    const seen = new WeakSet()

    function process(item) {
        // Handle primitives
        if (item === null || item === undefined || typeof item !== 'object') {
            // Convert BigInt to string
            if (typeof item === 'bigint') {
                return item.toString()
            }
            return item
        }

        // Handle circular references
        if (seen.has(item)) {
            return '[Circular Reference]'
        }
        seen.add(item)

        // Handle arrays
        if (Array.isArray(item)) {
            return item.map(process)
        }

        // Handle Date objects
        if (item instanceof Date) {
            return item.toISOString()
        }

        // Handle Error objects
        if (item instanceof Error) {
            return {
                name: item.name,
                message: item.message,
                stack: item.stack
            }
        }

        // Handle regular objects
        const result = {}
        for (const [key, value] of Object.entries(item)) {
            // Skip functions and symbols
            if (typeof value === 'function' || typeof value === 'symbol') {
                continue
            }

            try {
                result[key] = process(value)
            } catch (error) {
                result[key] = `[Unserializable: ${typeof value}]`
            }
        }

        return result
    }

    return process(obj)
}

/**
 * Safely stringify an object with circular reference handling
 * @param {any} obj - Object to stringify
 * @param {number} [space] - Number of spaces for indentation
 * @returns {string} JSON string representation
 */
export function safeStringify(obj, space = 0) {
    const serializable = makeSerializable(obj)
    return JSON.stringify(serializable, null, space)
}
