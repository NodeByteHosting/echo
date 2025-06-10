/**
 * Prompt service for centralized prompt management
 */
import fs from 'fs/promises'
import path from 'path'
import { aiConfig } from '../../configs/ai.config.js'
import { detectAndResolvePeople, isPersonaQuery, mentionsPersonaRelationships } from '../../utils/personaManager.js'

// Define prompt file extensions in order of preference
const PROMPT_EXTENSIONS = ['.echo', '.md', '.txt']
// Base path for prompt templates
const DEFAULT_PROMPT_PATH = 'd://@nodebyte/echo/prompts'

// Cache for prompt templates
const promptCache = new Map()

class PromptService {
    constructor() {
        this.initialized = false
        this.basePath = DEFAULT_PROMPT_PATH
        this.defaultPrompt = null
        this.promptTypes = {
            default: 'default',
            dm: 'dm',
            persona: 'persona',
            entity_mentions: 'entity_mentions',
            technical: 'technical',
            knowledge: 'knowledge_synthesis',
            research: 'research_synthesis',
            support: 'technical_support',
            code: 'code_analysis',
            conversation: 'conversation'
        }
    }

    /**
     * Initialize the prompt service
     * @param {Object} options - Configuration options
     */
    async initialize(options = {}) {
        this.basePath = options.basePath || aiConfig.promptPaths?.basePath || DEFAULT_PROMPT_PATH
        const force = options.force || false

        try {
            // Clear cache if forced
            if (force) {
                promptCache.clear()
                console.log('Prompt cache cleared')
            }

            // Load the default prompt first
            this.defaultPrompt = await this.loadPromptTemplate(this.promptTypes.default)

            // Validate that we have the essential prompts
            const essentialPrompts = [this.promptTypes.default, this.promptTypes.dm, this.promptTypes.persona]

            for (const promptType of essentialPrompts) {
                const prompt = await this.loadPromptTemplate(promptType)
                if (!prompt) {
                    console.warn(`Warning: Essential prompt template '${promptType}' not found`)
                }
            }

            this.initialized = true
            console.log('Prompt service initialized successfully')

            return true
        } catch (error) {
            console.error('Failed to initialize prompt service:', error)
            return false
        }
    }

    /**
     * Load a prompt template from file
     * @param {string} templateName - The name of the template
     * @returns {Promise<string>} The template content
     */
    async loadPromptTemplate(templateName) {
        // Check cache first
        const cacheKey = `${this.basePath}/${templateName}`
        if (promptCache.has(cacheKey)) {
            return promptCache.get(cacheKey)
        }

        // Try each supported extension
        for (const extension of PROMPT_EXTENSIONS) {
            try {
                const filePath = path.join(this.basePath, `${templateName}${extension}`)
                const exists = await fs
                    .access(filePath)
                    .then(() => true)
                    .catch(() => false)

                if (exists) {
                    const template = await fs.readFile(filePath, 'utf8')
                    // Cache the template
                    promptCache.set(cacheKey, template)
                    return template
                }
            } catch (error) {
                // Continue to the next extension
                continue
            }
        }

        console.warn(`Prompt template ${templateName} not found with any supported extension`)
        return null
    }

    /**
     * Get appropriate prompt based on message context
     * @param {Object} context - The message context
     * @returns {Promise<string>} The appropriate prompt
     */
    async getPromptForContext(context) {
        // Ensure the service is initialized
        if (!this.initialized) {
            await this.initialize()
        }

        const { message, isDM, guild, detectedEntities } = context

        let promptType = this.promptTypes.default

        // Determine the appropriate prompt type based on context
        if (isDM) {
            promptType = this.promptTypes.dm
        } else if (isPersonaQuery(message) || mentionsPersonaRelationships(message)) {
            promptType = this.promptTypes.persona
        } else if (detectedEntities && detectedEntities.length > 0) {
            promptType = this.promptTypes.entity_mentions
        } else if (context.messageType) {
            // Map message types to prompt types
            switch (context.messageType) {
                case 'technical':
                case 'support':
                    promptType = this.promptTypes.technical
                    break
                case 'knowledge':
                    promptType = this.promptTypes.knowledge
                    break
                case 'research':
                    promptType = this.promptTypes.research
                    break
                case 'code':
                    promptType = this.promptTypes.code
                    break
                case 'conversation':
                    promptType = this.promptTypes.conversation
                    break
            }
        }

        // Load the appropriate prompt template
        let promptTemplate = await this.loadPromptTemplate(promptType)

        // Fall back to default if the specific template is not found
        if (!promptTemplate) {
            promptTemplate = this.defaultPrompt
        }

        // No template found, return a basic prompt
        if (!promptTemplate) {
            return "You are Echo, NodeByte's fox assistant. Be helpful and knowledgeable."
        }

        // Process the template with variables
        return this.processTemplate(promptTemplate, context)
    }

    /**
     * Process a template with variables
     * @param {string} template - The template string
     * @param {Object} context - The context object with variables
     * @returns {string} The processed template
     */
    processTemplate(template, context) {
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
     * Create a context object for prompt generation
     * @param {string} message - The user message
     * @param {Object} contextData - Additional context data
     * @returns {Promise<Object>} The context object
     */
    async createContext(message, contextData = {}) {
        // Extract relevant information from contextData
        const { guild, channel, author, isDM = false, messageType = 'conversation' } = contextData

        // Detect entities in the message if guild is available
        let detectedEntities = []
        if (guild) {
            const detection = await detectAndResolvePeople(message, guild)
            detectedEntities = detection.mentions || []
        }

        // Build the context object
        const context = {
            message,
            messageType,
            isDM,
            detectedEntities,
            guildName: guild?.name || 'Direct Message',
            channelName: isDM ? 'DM' : channel?.name || 'Unknown Channel',
            userName: author?.username || author?.displayName || 'User',
            userId: author?.id || 'unknown',
            platform: 'discord',
            timestamp: new Date().toISOString()
        }

        // Add any additional context properties
        return { ...context, ...contextData }
    }

    /**
     * Get prompt for a specific agent
     * @param {string} agentType - The type of agent
     * @param {Object} context - The context object
     * @returns {Promise<string>} The agent-specific prompt
     */
    async getAgentPrompt(agentType, context) {
        // Map agent types to prompt types
        const promptMap = {
            TechnicalSupportAgent: this.promptTypes.support,
            ResearchAgent: this.promptTypes.research,
            KnowledgeAgent: this.promptTypes.knowledge,
            ConversationAgent: this.promptTypes.conversation,
            CodeAnalysisAgent: this.promptTypes.code
        }

        const promptType = promptMap[agentType] || this.promptTypes.default
        let promptTemplate = await this.loadPromptTemplate(promptType)

        // Fall back to default if agent-specific template not found
        if (!promptTemplate) {
            promptTemplate = this.defaultPrompt
        }

        return this.processTemplate(promptTemplate, context)
    }
}

// Create singleton instance
const promptServiceInstance = new PromptService()

// Export the singleton
export { promptServiceInstance as promptService }
