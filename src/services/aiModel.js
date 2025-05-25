import { generateText } from 'ai'
import { aiConfig } from '../configs/ai.config.js'

/**
 * AI Model wrapper that provides a consistent interface for agents
 */
export class AIModel {
    constructor(provider) {
        this.provider = provider
    }

    /**
     * Generate a response using the AI model
     * @param {string} prompt - The prompt to send to the AI
     * @param {Object} options - Additional options for the AI request
     * @returns {Promise<string>} The generated response
     */
    async getResponse(prompt, options = {}) {
        try {
            const result = await generateText({
                model: this.provider(aiConfig.model),
                prompt,
                temperature: options.temperature ?? aiConfig.temperature,
                maxTokens: options.maxTokens ?? aiConfig.maxTokens,
                system: options.systemPrompt ?? aiConfig.systemPrompt
            })

            return result.text
        } catch (error) {
            console.error('AI Model Error:', error)
            throw new Error(`AI model request failed: ${error.message}`)
        }
    }

    /**
     * Generate a response with custom system prompt
     * @param {string} prompt - The user prompt
     * @param {string} systemPrompt - Custom system prompt
     * @param {Object} options - Additional options
     * @returns {Promise<string>} The generated response
     */
    async getResponseWithSystem(prompt, systemPrompt, options = {}) {
        return this.getResponse(prompt, {
            ...options,
            systemPrompt
        })
    }
}
