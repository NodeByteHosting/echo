/**
 * Executes a promise with a timeout
 * @param {Promise} promise - The promise to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string|Object} fallbackValue - Value to return if timeout occurs
 * @returns {Promise} - The result of the promise or fallback if timeout
 */
export const withTimeout = (promise, timeoutMs = 30000, fallbackValue = null) => {
    return new Promise(resolve => {
        const timeoutId = setTimeout(() => {
            if (typeof fallbackValue === 'string') {
                resolve({ content: fallbackValue, error: 'timeout' })
            } else {
                resolve(fallbackValue)
            }
        }, timeoutMs)

        promise
            .then(result => {
                clearTimeout(timeoutId)
                resolve(result)
            })
            .catch(error => {
                clearTimeout(timeoutId)
                console.error('Promise error in withTimeout:', error)
                if (typeof fallbackValue === 'string') {
                    resolve({ content: fallbackValue, error: error.message })
                } else {
                    resolve(fallbackValue)
                }
            })
    })
}
