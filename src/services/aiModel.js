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
     * @param {string|Object} prompt - The prompt to send to the AI or options object
     * @param {Object} options - Additional options for the AI request
     * @returns {Promise<string>} The generated response
     */
    async getResponse(prompt, options = {}) {
        try {
            // Handle case where prompt is an object with message and context
            let message, context

            if (typeof prompt === 'object' && prompt !== null) {
                message = prompt.message
                context = prompt.context || {}
                // Merge any additional options
                options = { ...options, ...prompt }
            } else {
                message = prompt
                context = options.context || {}
            }

            // Optimize prompt to reduce token usage
            const optimizedPrompt = this._optimizePrompt(message)

            // Determine which system prompt to use
            let systemPrompt = options.systemPrompt || aiConfig.systemPrompt

            // If a template is specified, use a dedicated prompt
            if (context.template) {
                systemPrompt = this._getTemplateSystemPrompt(context.template, systemPrompt)
            } else {
                // Otherwise, optimize system prompt based on the query type
                systemPrompt = this._selectOptimalSystemPrompt(optimizedPrompt, systemPrompt)
            }

            // Debug log the system prompt being used (truncated for brevity)
            console.log(`Using system prompt: ${systemPrompt.substring(0, 100)}...`)

            // Set a reasonable default max tokens based on prompt length
            const dynamicMaxTokens = this._calculateOptimalTokens(optimizedPrompt)

            // Create a proper system message that won't be overridden
            const result = await generateText({
                model: this.provider(options.model || aiConfig.model),
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: optimizedPrompt }
                ],
                temperature: options.temperature ?? aiConfig.temperature,
                maxTokens: options.maxTokens ?? dynamicMaxTokens
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

    /**
     * Get template-specific system prompt
     * @param {string} template - Template name
     * @param {string} defaultPrompt - Default system prompt
     * @returns {string} Template-specific system prompt
     * @private
     */
    _getTemplateSystemPrompt(template, defaultPrompt) {
        const templates = {
            knowledge_synthesis: `${aiConfig.shortSystemPrompt}
You are analyzing knowledge base entries to provide a helpful, accurate response.
Focus on synthesizing information clearly and accurately.
Always maintain Echo's personality, but prioritize technical accuracy.`,

            research_synthesis: `${aiConfig.technicalPrompt}
You are analyzing research results from web searches.
Synthesize the information into a comprehensive answer.
Cite sources when appropriate and maintain technical accuracy.`,

            technical_support: `${aiConfig.technicalPrompt}
You are helping with a technical support issue.
Provide clear, step-by-step instructions.
Be thorough and consider the user's specific environment and context.`,

            code_analysis: `${aiConfig.technicalPrompt}
You are analyzing code.
Focus on correctness, performance, and best practices.
Provide specific examples and explanations for your recommendations.`
        }

        return templates[template] || defaultPrompt
    }

    /**
     * Optimize prompt to reduce token usage
     * @private
     */
    _optimizePrompt(prompt) {
        if (typeof prompt !== 'string') {
            // Handle non-string prompts by extracting message
            if (prompt.message) {
                prompt = prompt.message
            } else if (prompt.prompt) {
                prompt = prompt.prompt
            } else {
                return String(prompt)
            }
        }

        // Remove redundant whitespace
        let optimized = prompt.trim().replace(/\s+/g, ' ')

        // Truncate extremely long prompts
        if (optimized.length > 8000) {
            optimized = optimized.substring(0, 8000) + '\n[Note: The prompt was truncated due to length.]'
        }

        return optimized
    }

    /**
     * Select the optimal system prompt based on query type
     * @private
     */
    _selectOptimalSystemPrompt(prompt, fullSystemPrompt) {
        // For very short queries, use the full system prompt
        if (prompt.length < 50) {
            return fullSystemPrompt
        }

        // Extract just the personality and core instructions for longer queries
        const coreSystemPrompt =
            fullSystemPrompt.split('Your job is to assist users with:')[0] +
            'Your job is to assist users with technical support, knowledge, and conversation.'

        // Detect if this needs detailed technical info
        const needsDetailedTechnical =
            prompt.includes('code') ||
            prompt.includes('error') ||
            prompt.includes('how to') ||
            prompt.includes('config')

        if (needsDetailedTechnical) {
            // Add the technical response guidelines
            return (
                coreSystemPrompt +
                '\n\n**When answering technical questions:**\n' +
                '- Give direct, clear instructions with minimal fluff.\n' +
                '- Include code or config examples wherever helpful.\n' +
                '- Warn users about risks or common pitfalls with a sly comment.\n'
            )
        }

        return coreSystemPrompt
    }

    /**
     * Calculate optimal max tokens based on prompt length
     * @private
     */
    _calculateOptimalTokens(prompt) {
        // Rough estimate: 1 token ≈ 4 characters for English text
        const estimatedPromptTokens = Math.ceil(prompt.length / 4)

        // For short prompts, we need more tokens for the response
        if (estimatedPromptTokens < 100) {
            return Math.min(2000, aiConfig.maxTokens)
        }

        // For medium prompts
        if (estimatedPromptTokens < 500) {
            return Math.min(1500, aiConfig.maxTokens)
        }

        // For long prompts, be more conservative with response tokens
        return Math.min(1000, aiConfig.maxTokens)
    }
}
