/**
 * Base class for AI agents, providing common functionality
 */
export class BaseAgent {
    /**
     * Create an instance of BaseAgent
     * @param {Object} tools - Object containing tools to be used by the agent
     * @param {Object} aiModel - The AI model to use for advanced reasoning
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
        const prompt = `As an AI agent, analyze this user message and current context to determine what additional information might be needed to provide the best response. Return only the essential questions, if any.

User message: "${message}"
Current context: ${JSON.stringify(currentContext)}

Return format: Array of questions or empty array if no context needed.`

        const response = await this.aiModel.getResponse(prompt)
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
        const prompt = `As a specialized ${this.constructor.name}, help the user with their request.

Available context:
${JSON.stringify(context, null, 2)}

User message: "${message}"

Provide a helpful, accurate, and detailed response while staying within your specialized domain.`

        return this.aiModel.getResponse(prompt)
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
    } /**
     * Determine if the agent can handle the given message
     * @param {Object} _message - The message to be handled
     * @returns {boolean} - True if the agent can handle the message, false otherwise
     */
    async canHandle(_message) {
        return false // Override in subclasses
    }

    /**
     * Process user message and generate response
     * @param {Object} _message - The message to be processed
     * @param {string} _userId - The ID of the user
     * @param {Object} _contextData - The context data for the user
     * @returns {Promise<Object>} - The result of the processing
     */
    async process(_message, _userId, _contextData) {
        throw new Error('processMessage must be implemented by subclasses')
    }

    /**
     * Update user context with new data
     * @param {string} _userId - The ID of the user
     * @param {Object} _newContextData - The new context data to be merged
     * @returns {Promise<void>}
     */
    async updateContext(_userId, _newContextData) {
        throw new Error('updateContext must be implemented by subclasses')
    }

    /**
     * Get response to user message
     * @param {Object} _message - The message to be responded to
     * @returns {Promise<Object>} - The response to the message
     */
    async getResponse(_message) {
        throw new Error('getResponse must be implemented by subclasses')
    }

    /**
     * Validate the result before sending it to the user
     * @param {Object} _result - The result to be validated
     * @returns {boolean} - True if the result is valid, false otherwise
     */
    async validateResult(_result) {
        return true // Override in subclasses if needed
    }
}

export default BaseAgent
