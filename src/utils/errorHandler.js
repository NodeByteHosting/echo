/**
 * Standardized error handling utilities for the application
 */
import { log } from '../functions/logger.js'

/**
 * Error types for standardized error handling
 */
export const ErrorType = {
    // System errors
    INITIALIZATION: 'initialization_error',
    CONFIGURATION: 'configuration_error',
    NETWORK: 'network_error',
    DATABASE: 'database_error',

    // AI errors
    MODEL: 'model_error',
    PROMPT: 'prompt_error',
    CONTEXT: 'context_error',
    PARSING: 'parsing_error',

    // Agent errors
    PROCESSING: 'processing_error',
    VALIDATION: 'validation_error',
    RATE_LIMIT: 'rate_limit_error',

    // Integration errors
    API: 'api_error',
    DISCORD: 'discord_error',
    EXTERNAL: 'external_service_error',

    // Generic
    UNKNOWN: 'unknown_error'
}

/**
 * Standard error response format
 * @param {string} message - Error message
 * @param {string} type - Error type from ErrorType enum
 * @param {boolean} recoverable - Whether the error is recoverable
 * @param {string} [suggestedAction] - Suggested action for the user
 * @returns {Object} Standardized error response
 */
export function createErrorResponse(message, type = ErrorType.UNKNOWN, recoverable = true, suggestedAction = null) {
    return {
        content: message,
        error: true,
        errorType: type,
        recoverable,
        suggestedAction: suggestedAction || getDefaultSuggestion(type)
    }
}

/**
 * Handle errors in processing methods with standardized logging and responses
 * @param {Error} error - The caught error
 * @param {Object} context - Context information
 * @param {string} source - Source of the error (agent/component name)
 * @returns {Object} Error response object
 */
export function handleProcessingError(error, context = {}, source = 'agent') {
    // Log the error
    log(`Error in ${source}:`, 'error', {
        error: error.message,
        stack: error.stack,
        context: JSON.stringify(context).substring(0, 200) + '...'
    })

    // Determine error type
    let errorType = ErrorType.UNKNOWN
    let recoverable = true

    if (
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED')
    ) {
        errorType = ErrorType.NETWORK
    } else if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
        errorType = ErrorType.RATE_LIMIT
        recoverable = false
    } else if (error.message.includes('API') || error.message.includes('key')) {
        errorType = ErrorType.API
    } else if (error.message.includes('context') || error.message.includes('prompt')) {
        errorType = ErrorType.CONTEXT
    } else if (error.message.includes('parse') || error.message.includes('JSON')) {
        errorType = ErrorType.PARSING
    } else if (error.message.includes('database') || error.message.includes('query')) {
        errorType = ErrorType.DATABASE
    }

    // Create appropriate error message
    let errorMessage = `Error ${context.analysisType || 'processing your request'}: ${error.message}`

    // Add specific guidance based on error type
    if (errorType === ErrorType.PARSING) {
        errorMessage += "\n\nI couldn't properly process the results. This may happen with complex requests."
    } else if (errorType === ErrorType.NETWORK) {
        errorMessage += '\n\nThere was a network issue connecting to required services.'
    } else if (errorType === ErrorType.RATE_LIMIT) {
        errorMessage += '\n\nRate limit exceeded. Please try again later.'
    } else if (errorType === ErrorType.CONTEXT) {
        errorMessage += "\n\nI'm missing necessary context. Please provide more details."
    }

    return createErrorResponse(errorMessage, errorType, recoverable, getDefaultSuggestion(errorType))
}

/**
 * Get a default suggestion based on error type
 * @param {string} errorType - The error type
 * @returns {string} Suggested action
 */
function getDefaultSuggestion(errorType) {
    switch (errorType) {
        case ErrorType.NETWORK:
            return 'Check your internet connection and try again.'
        case ErrorType.RATE_LIMIT:
            return 'Please wait a moment before trying again.'
        case ErrorType.PARSING:
            return 'Try rephrasing your request or providing clearer information.'
        case ErrorType.CONTEXT:
            return 'Please provide more details or context to help me understand.'
        case ErrorType.API:
            return "There's an issue with an external service. Please try again later."
        case ErrorType.DATABASE:
            return "There's a database issue. Please try again later."
        default:
            return 'Please try again or rephrase your request.'
    }
}

/**
 * Safely handle async operations with timeout
 * @param {Promise} promise - The promise to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name of the operation for error reporting
 * @returns {Promise} The result of the operation or error
 */
export async function withTimeout(promise, timeoutMs = 10000, operationName = 'operation') {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`${operationName} timed out after ${timeoutMs}ms`))
        }, timeoutMs)
    })

    try {
        return await Promise.race([promise, timeoutPromise])
    } catch (error) {
        log(`Timeout error in ${operationName}:`, 'error', error)
        throw error
    }
}
