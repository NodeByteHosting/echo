/**
 * Prompt service for centralized prompt management
 */
import fs from 'fs/promises'
import path from 'path'
import { aiConfig } from '../../configs/ai.config.js'
import { log } from '../../functions/logger.js'
import { CacheManager } from '../../utils/cacheManager.js'

// Cache for prompt templates
const promptCache = new CacheManager({
    maxSize: 100,
    ttl: 86400000 // 24 hours
})

// Define supported prompt file extensions
const PROMPT_EXTENSIONS = ['.echo', '.txt', '.md']

class PromptService {
    constructor() {
        this.prompts = new Map()
        this.initialized = false
        this.basePath = process.env.PROMPT_PATH || 'd://@nodebyte/echo/src/echo-ai/prompts'
    }

    /**
     * Initialize the prompt service and load all prompts
     * @param {Object} options - Initialization options
     * @param {boolean} [options.force=false] - Force reload all prompts
     * @returns {Promise<void>}
     */
    async initialize(options = {}) {
        if (this.initialized && !options.force) {
            return
        }

        try {
            // Get all prompt files from the directory
            const files = await fs.readdir(this.basePath)

            // Load each prompt file
            for (const file of files) {
                if (PROMPT_EXTENSIONS.some(ext => file.endsWith(ext))) {
                    const promptName = path.basename(file, path.extname(file))
                    await this.loadPrompt(promptName)
                }
            }

            this.initialized = true
            log(`Prompt service initialized with ${this.prompts.size} prompts`, 'info')
        } catch (error) {
            log(`Error initializing prompt service: ${error.message}`, 'error')
            throw error
        }
    }

    /**
     * Load a specific prompt by name
     * @param {string} promptName - The name of the prompt to load
     * @returns {Promise<string|null>} The prompt template or null if not found
     */
    async loadPrompt(promptName) {
        try {
            // Try each supported extension
            for (const extension of PROMPT_EXTENSIONS) {
                try {
                    const filePath = path.join(this.basePath, `${promptName}${extension}`)
                    const exists = await fs
                        .access(filePath)
                        .then(() => true)
                        .catch(() => false)

                    if (exists) {
                        const template = await fs.readFile(filePath, 'utf8')
                        this.prompts.set(promptName, template)
                        return template
                    }
                } catch (error) {
                    // Continue to the next extension
                    continue
                }
            }

            log(`Prompt ${promptName} not found with any supported extension`, 'warn')
            return null
        } catch (error) {
            log(`Error loading prompt ${promptName}: ${error.message}`, 'error')
            return null
        }
    }

    /**
     * Get a prompt template by name
     * @param {string} promptName - The name of the prompt
     * @returns {Promise<string|null>} The prompt template or null if not found
     */
    async getPrompt(promptName) {
        // Check if already loaded
        if (this.prompts.has(promptName)) {
            return this.prompts.get(promptName)
        }

        // Try to load it
        return await this.loadPrompt(promptName)
    }

    /**
     * Get an agent-specific prompt
     * @param {string} agentName - The agent class name
     * @param {Object} context - The context data
     * @returns {Promise<string|null>} The agent prompt or null if not found
     */
    async getAgentPrompt(agentName, context) {
        // Convert agent class name to prompt name (e.g., ConversationAgent -> conversation)
        const promptName = agentName.replace('Agent', '').toLowerCase()

        // Try to get the agent-specific prompt
        let prompt = await this.getPrompt(promptName)

        // Fall back to default if not found
        if (!prompt) {
            prompt = await this.getPrompt('default')
        }

        // Process the prompt with the context
        if (prompt) {
            return this.processTemplate(prompt, context)
        }

        return null
    }

    /**
     * Get a prompt based on context
     * @param {Object} context - The context data
     * @returns {Promise<string>} The processed prompt
     */
    async getPromptForContext(context) {
        // Only allow new prompt names
        const allowedPrompts = ['core', 'conversation', 'technical', 'synthesis']
        const promptName = context.messageType
        if (!allowedPrompts.includes(promptName)) {
            throw new Error('Invalid or deprecated prompt requested: ' + promptName)
        }

        // Generate a cache key based on relevant context data
        const cacheKey = this._generatePromptCacheKey(context)

        // Check cache first
        const cachedPrompt = promptCache.get(cacheKey)
        if (cachedPrompt) {
            return cachedPrompt
        }

        // Get the prompt template
        let template = await this.getPrompt(promptName)

        // Fall back to default if not found
        if (!template) {
            template = await this.getPrompt('default')

            // If still not found, use hardcoded default
            if (!template) {
                template = aiConfig.systemPrompt
            }
        }

        // Process the template with context variables
        const processedPrompt = this.processTemplate(template, context)

        // Cache the processed prompt
        promptCache.set(cacheKey, processedPrompt)

        return processedPrompt
    }

    /**
     * Process a template string with variables
     * @param {string} template - Template string with {{variable}} placeholders
     * @param {Object} context - Context object with variables
     * @returns {string} Processed template
     */
    processTemplate(template, context = {}) {
        if (!template) {
            return ''
        }

        let processed = template

        // Simple variable replacement
        processed = processed.replace(/{{(\w+)}}/g, (match, variable) => {
            return context[variable] !== undefined ? context[variable] : match
        })

        // Handle conditional blocks - basic implementation
        // {{#if variable}}content{{/if}}
        processed = processed.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
            return context[variable] ? content : ''
        })

        // Handle conditional blocks with else - basic implementation
        // {{#if variable}}content{{else}}alternative{{/if}}
        processed = processed.replace(
            /{{#if (\w+)}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g,
            (match, variable, content, alternative) => {
                return context[variable] ? content : alternative
            }
        )

        // Handle each loops - basic implementation
        // {{#each variable}}content with {{name}} etc{{/each}}
        processed = processed.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (match, variable, template) => {
            if (!context[variable] || !Array.isArray(context[variable])) {
                return ''
            }

            return context[variable]
                .map(item => {
                    let itemContent = template
                    // Replace item properties
                    Object.keys(item).forEach(key => {
                        itemContent = itemContent.replace(
                            new RegExp(`{{${key}}}`, 'g'),
                            item[key] !== undefined ? item[key] : ''
                        )
                    })
                    return itemContent
                })
                .join('\n')
        })

        return processed
    }

    /**
     * Create a context object for prompt processing
     * @param {string} message - User message
     * @param {Object} additionalContext - Additional context data
     * @returns {Promise<Object>} Context object
     */
    async createContext(message, additionalContext = {}) {
        // Base context with message
        const context = {
            message,
            timestamp: new Date().toISOString(),
            ...additionalContext
        }

        // Add default values for commonly used context variables
        if (!context.guildName && additionalContext.guild) {
            context.guildName = additionalContext.guild.name
        }

        if (!context.channelName && additionalContext.channel) {
            context.channelName = additionalContext.channel.name
        }

        if (!context.userName && additionalContext.user) {
            context.userName = additionalContext.user.username || 'User'
        }

        return context
    }

    /**
     * Generate a cache key for prompt context
     * @param {Object} context - Context data
     * @returns {string} Cache key
     * @private
     */
    _generatePromptCacheKey(context) {
        // Only include relevant fields for cache key
        const keyParts = [
            context.messageType || 'default',
            context.agentType || '',
            context.isDM ? 'dm' : '',
            context.detectedEntities?.length ? 'entities' : ''
        ].filter(Boolean)

        return `prompt:${keyParts.join(':')}`
    }

    /**
     * Determine which prompt to use based on context
     * @param {Object} context - Context data
     * @returns {string} Prompt name
     * @private
     */
    _determinePromptName(context) {
        // First check if a specific message type is requested
        if (context.messageType) {
            return context.messageType
        }

        // Check for specialized contexts
        if (context.isDM) {
            return 'dm'
        }

        if (context.isPersonaQuery) {
            return 'persona'
        }

        if (context.detectedEntities?.length > 0) {
            return 'entity_mentions'
        }

        // Fall back to default
        return 'default'
    }
}

// Create singleton instance
const promptService = new PromptService()

export { promptService }
