import { generateText } from 'ai'
import { aiConfig } from '#configs/ai.config.js'
import { promptService } from '#ai/services/prompt.service.js'

// Simple rate limiter for OpenAI requests
class RateLimiter {
    constructor(maxRequests = 3, windowMs = 60000) {
        this.maxRequests = maxRequests
        this.windowMs = windowMs
        this.requests = []
    }

    async waitForSlot() {
        const now = Date.now()
        // Remove old requests outside the window
        this.requests = this.requests.filter(time => now - time < this.windowMs)
        
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0]
            const waitTime = this.windowMs - (now - oldestRequest) + 100 // Add 100ms buffer
            console.log(`Rate limit: waiting ${waitTime}ms before next request`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            return this.waitForSlot() // Recursive call after waiting
        }
        
        this.requests.push(now)
    }
}

const rateLimiter = new RateLimiter(3, 60000) // 3 requests per minute

/**
 * AI Model wrapper that provides a consistent interface for agents
 */
export class AIModel {
    constructor(provider) {
        this.provider = provider
        // Initialize prompt service
        promptService.initialize().catch(err => {
            console.error('Failed to initialize prompt service:', err)
        })
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
            let systemPrompt

            // If a custom system prompt is provided, use it directly
            if (options.systemPrompt) {
                systemPrompt = options.systemPrompt
            }
            // If a template name is specified, use the prompt service to get it
            else if (context.template) {
                const templateContext = await promptService.createContext(optimizedPrompt, {
                    ...context,
                    messageType: context.template
                })
                systemPrompt = await promptService.getPromptForContext(templateContext)
            }
            // Otherwise, get the appropriate prompt based on message context
            else {
                // Create context object for prompt selection
                const promptContext = await promptService.createContext(optimizedPrompt, context)
                // Get appropriate prompt based on context
                systemPrompt = await promptService.getPromptForContext(promptContext)
            }

            // Fall back to config system prompt if all else fails
            if (!systemPrompt) {
                systemPrompt = aiConfig.systemPrompt
            }

            // Debug log the system prompt being used (truncated for brevity)
            console.log(`Using system prompt: ${systemPrompt.substring(0, 100)}...`)

            // Set a reasonable default max tokens based on prompt length
            const dynamicMaxTokens = this._calculateOptimalTokens(optimizedPrompt)

            // Wait for rate limit slot before making request
            await rateLimiter.waitForSlot()

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
            
            // Check if it's a rate limit error
            if (error.message?.includes('Rate limit') || error.statusCode === 429) {
                throw new Error('Rate limit exceeded. Please try again in a moment.')
            }
            
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
     * Get prompt for specific template
     * @param {string} template - Template name
     * @param {Object} context - Context for template processing
     * @returns {Promise<string>} Processed template
     */
    async getPromptForTemplate(template, context = {}) {
        // Only allow new prompt names
        if (!['core', 'conversation', 'technical', 'synthesis'].includes(template)) {
            throw new Error('Invalid or deprecated prompt template requested: ' + template)
        }
        return promptService.getPromptForContext({
            ...context,
            messageType: template
        })
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
