import { makeSerializable } from '../../utils/serialization.js'
import { promptService } from '../services/prompt.service.js'

/**
 * Base class for AI agents, providing common functionality
 */
export class BaseAgent {
    /**
     * Create an instance of BaseAgent
     * @param {Object} [tools] - Object containing tools to be used by the agent
     * @param {Object} [aiModel] - The AI model to use for advanced reasoning
     */
    constructor(tools, aiModel) {
        this.tools = tools
        this.aiModel = aiModel
        this.contextQuestions = new Map() // Track pending context questions per user
    }

    /**
     * Ask the AI model for context questions based on the message
     * @param {string} message - The user's message
     * @param {Object} currentContext - Current context data
     * @returns {Promise<string[]>} Array of questions to ask
     */
    async determineContextNeeded(message, currentContext = {}) {
        const serializableContext = makeSerializable(currentContext)

        // Create context for prompt selection
        const promptContext = await promptService.createContext(message, {
            ...currentContext,
            messageType: 'context_determination'
        })

        const prompt = `As an AI agent, analyze this user message and current context to determine what additional information might be needed to provide the best response. Return only the essential questions, if any.

User message: "${message}"
Current context: ${JSON.stringify(serializableContext)}

Return format: Array of questions or empty array if no context needed.`

        const response = await this.aiModel.getResponse(prompt, {
            context: promptContext
        })

        try {
            return JSON.parse(response)
        } catch {
            return []
        }
    }

    /**
     * Generate a dynamic response using the AI model
     * @param {string} message - The user's message
     * @param {Object} context - Context data including user info, history, etc.
     * @returns {Promise<string>} The generated response
     */
    async generateResponse(message, context) {
        const serializableContext = makeSerializable(context)

        // Get agent-specific prompt from prompt service
        const agentName = this.constructor.name
        const promptContext = await promptService.createContext(message, {
            ...context,
            agentType: agentName
        })

        const systemPrompt = await promptService.getAgentPrompt(agentName, promptContext)

        // Fall back to a default prompt if agent-specific one isn't available
        if (!systemPrompt) {
            const prompt = `As a specialized ${agentName}, help the user with their request.

Available context:
${JSON.stringify(serializableContext, null, 2)}

User message: "${message}"

Provide a helpful, accurate, and detailed response while staying within your specialized domain.`

            return this.aiModel.getResponse(message, {
                systemPrompt: prompt,
                context: promptContext
            })
        }

        // Use the agent-specific prompt
        return this.aiModel.getResponse(message, {
            systemPrompt,
            context: promptContext
        })
    }

    /**
     * Check if we're waiting for context from this user
     * @param {string} userId - The user's ID
     * @returns {boolean} True if waiting for context
     */
    isAwaitingContext(userId) {
        return this.contextQuestions.has(userId)
    }

    /**
     * Store context question for user
     * @param {string} userId - The user's ID
     * @param {string} question - The context question
     */
    setContextQuestion(userId, question) {
        this.contextQuestions.set(userId, question)
    }

    /**
     * Clear context question for user
     * @param {string} userId - The user's ID
     */
    clearContextQuestion(userId) {
        this.contextQuestions.delete(userId)
    }

    /**
     * Standard error handling for agents
     * @param {Error} error - The error to handle
     * @param {Object} contextData - Context data about the request
     * @returns {Object} Standardized error response
     */
    _handleError(error, contextData = {}) {
        console.error(`${this.constructor.name} error:`, error.message, error.stack)

        let errorMessage = `Error processing your request: ${error.message}`
        let errorType = 'processing_error'
        let recoverable = true
        let suggestedAction = 'Please try again or rephrase your question.'

        // Customize error handling based on error type
        if (error.message.includes('JSON Parse error') || error.message.includes('Unexpected token')) {
            errorType = 'parsing_error'
            errorMessage += '\n\nI had trouble processing the data. This typically happens with complex input.'
            suggestedAction = 'Try simplifying your request or breaking it into smaller parts.'
        } else if (error.message.includes('timeout')) {
            errorType = 'timeout_error'
            errorMessage += '\n\nThe operation took too long to complete.'
            suggestedAction = 'Try again with a simpler query or at a less busy time.'
        } else if (error.message.includes('rate limit')) {
            errorType = 'rate_limit_error'
            errorMessage = "You've reached the rate limit for this operation."
            suggestedAction = 'Please wait a moment before trying again.'
            recoverable = false
        }

        return {
            content: errorMessage,
            error: true,
            errorType,
            recoverable,
            suggestedAction
        }
    }

    /**
     * Format a standard agent response
     * @param {string|Object} content - Response content
     * @param {Object} options - Additional options
     * @returns {Object} Formatted response
     */
    _formatResponse(content, options = {}) {
        // If content is already an object, assume it's properly formatted
        if (typeof content === 'object' && content !== null) {
            return content
        }

        // Build standard response object
        return {
            content: content || "I'm sorry, I couldn't generate a response.",
            ...options
        }
    }

    /**
     * Determine if the agent can handle the given message
     * @param {string} _message - The message to be handled
     * @returns {Promise<boolean>} - True if the agent can handle the message
     */
    async canHandle(_message) {
        return false // Override in subclasses
    }

    /**
     * Process user message and generate response
     * @param {string} _message - The message to be processed
     * @param {string} _userId - The ID of the user
     * @param {Object} _contextData - The context data for the user
     * @returns {Promise<Object>} - The result of the processing
     */
    async process(_message, _userId, _contextData) {
        throw new Error('process must be implemented by subclasses')
    }
}

// Remove deprecated prompt templates and logic
// Only use: core, conversation, technical, synthesis

export default BaseAgent
