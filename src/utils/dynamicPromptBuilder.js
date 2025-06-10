/**
 * Utility for building dynamic prompts based on context
 */
import { promptService } from '../echo-ai/services/prompt.service.js'
import { processTemplate, optimizePrompt } from '../echo-ai/utils/promptUtils.js'
import { log } from '../functions/logger.js'

// Cache for prompt templates
const promptCache = new Map()

// Define supported prompt file extensions
const PROMPT_EXTENSIONS = ['.echo', '.txt', '.md']

/**
 * Load a prompt template from a file
 * @param {string} templateName - The name of the template
 * @param {string} basePath - Base path for templates
 * @returns {Promise<string>} The template content
 */
export async function loadPromptTemplate(templateName, basePath = 'd://@nodebyte/echo/prompts') {
    // Check cache first
    const cacheKey = `${basePath}/${templateName}`
    if (promptCache.has(cacheKey)) {
        return promptCache.get(cacheKey)
    }

    // Try each supported extension
    for (const extension of PROMPT_EXTENSIONS) {
        try {
            const filePath = path.join(basePath, `${templateName}${extension}`)
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

    console.error(`Error loading prompt template ${templateName}: No file found with supported extensions`)
    return null
}

/**
 * Build a dynamic prompt using a template and variables
 * @param {string} template - The prompt template
 * @param {Object} variables - Variables to inject into the template
 * @returns {string} The built prompt
 */
export function buildPrompt(template, variables = {}) {
    return processTemplate(template, variables)
}

/**
 * Create a context-aware prompt for the AI
 * @param {Object} context - The context object with all variables
 * @param {string} defaultTemplate - Default template name to use
 * @returns {Promise<string>} The built prompt
 */
export async function createContextPrompt(context, defaultTemplate = 'default') {
    try {
        // Use the prompt service instead of direct file operations
        const promptContext = await promptService.createContext(context.message || '', context)
        return await promptService.getPromptForContext(promptContext)
    } catch (error) {
        log('Error creating context prompt', 'error', error)
        // Fall back to a simple default prompt
        return `You are Echo, NodeByte's fox assistant. Be helpful and knowledgeable.

Current context:
- User: ${context.user?.username || 'User'}
- Message: ${context.message || 'No message provided'}
${context.detectedEntities?.length > 0 ? `- Mentioned entities: ${context.detectedEntities.map(e => e.name).join(', ')}` : '- No entities mentioned'}`
    }
}

/**
 * Enhance a base prompt with additional context
 * @param {string} basePrompt - The base prompt
 * @param {Object} context - The context object
 * @returns {string} The enhanced prompt
 */
export function enhancePromptWithContext(basePrompt, context) {
    if (!basePrompt) {
        return ''
    }

    let enhancedPrompt = basePrompt

    // Add platform-specific context
    enhancedPrompt += `\n\n--- PLATFORM CONTEXT ---\nYou are responding on Discord${context.isDM ? ' via direct message' : ' in a server'}.`

    // Add user context
    if (context.user) {
        enhancedPrompt += `\nThe user you're talking to is: ${context.user.displayName || context.user.username}`
    }

    // Add server context if not a DM
    if (!context.isDM && context.guild) {
        enhancedPrompt += `\nServer name: ${context.guild.name}`
        enhancedPrompt += `\nChannel: ${context.channelName || 'Unknown channel'}`
    }

    // Add entity mentions context
    if (context.detectedEntities?.length > 0) {
        enhancedPrompt += '\n\n--- MENTIONED ENTITIES ---'

        // Group by entity type
        const userMentions = context.detectedEntities.filter(e => e.type === 'user')
        const channelMentions = context.detectedEntities.filter(e => e.type === 'channel')
        const roleMentions = context.detectedEntities.filter(e => e.type === 'role')

        if (userMentions.length > 0) {
            enhancedPrompt += `\nUsers: ${userMentions.map(u => u.name).join(', ')}`
        }

        if (channelMentions.length > 0) {
            enhancedPrompt += `\nChannels: ${channelMentions.map(c => '#' + c.name).join(', ')}`
        }

        if (roleMentions.length > 0) {
            enhancedPrompt += `\nRoles: ${roleMentions.map(r => '@' + r.name).join(', ')}`
        }
    }

    // Add conversational instructions
    enhancedPrompt += `\n\n--- RESPONSE GUIDELINES ---
- Be conversational and natural in your response
- You can mention users with <@user_id> format, channels with <#channel_id>, and roles with <@&role_id>
- Keep your response concise and to the point`

    return enhancedPrompt
}

/**
 * Define prompts by category for different contexts
 * @param {Object} options - Configuration options
 * @returns {Object} Map of prompt templates by category
 */
export function definePromptCategories(options = {}) {
    const basePath = options.basePath || 'd://@nodebyte/echo/prompts'

    return {
        general: {
            default: 'default',
            dm: 'dm',
            persona: 'persona'
        },
        technical: {
            default: 'technical',
            code: 'code_assistance',
            debug: 'debugging'
        },
        fun: {
            default: 'fun',
            roleplay: 'roleplay',
            creative: 'creative'
        }
    }
}

/**
 * Create a dynamic prompt based on detected entities and context
 * @param {Object} context - The context for prompt creation
 * @param {Array} detectedEntities - Detected entities in the message
 * @returns {Promise<string>} A dynamic system prompt
 */
export async function createDynamicPrompt(context, detectedEntities = []) {
    // Use the prompt service to get a context-specific prompt
    try {
        const enrichedContext = {
            ...context,
            detectedEntities
        }

        // For entity mentions, use the entity_mentions prompt type
        if (detectedEntities.length > 0) {
            enrichedContext.messageType = 'entity_mentions'
        }

        return await promptService.getPromptForContext(enrichedContext)
    } catch (error) {
        log('Error creating dynamic prompt', 'error', error)
        // Fallback to simpler prompt
        return `You are Echo, NodeByte's fox assistant. Be helpful and knowledgeable.

Current context:
- User: ${context.user?.username || 'User'}
- Message: ${context.message || 'No message provided'}
- ${detectedEntities.length > 0 ? `Mentioned entities: ${detectedEntities.map(e => e.name).join(', ')}` : 'No entities mentioned'}`
    }
}
