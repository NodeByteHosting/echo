/**
 * Utility for building dynamic prompts based on context
 */
import { promptService } from '../echo-ai/services/prompt.service.js'
import { log } from '../functions/logger.js'

/**
 * Build a dynamic prompt using a template and variables
 * @deprecated Use promptService.processTemplate instead.
 */
export function buildPrompt(template, variables = {}) {
    return promptService.processTemplate(template, variables)
}

/**
 * Create a context-aware prompt for the AI
 * @param {Object} context - The context object with all variables
 * @param {string} defaultTemplate - Default template name to use
 * @returns {Promise<string>} The built prompt
 */
export async function createContextPrompt(context, defaultTemplate = 'core') {
    try {
        const promptContext = await promptService.createContext(context.message || '', context)
        return await promptService.getPromptForContext(promptContext)
    } catch (error) {
        log('Error creating context prompt', 'error', error)
        return `You are Echo, NodeByte's fox assistant. Be helpful and knowledgeable.\n\nCurrent context:\n- User: ${context.user?.username || 'User'}\n- Message: ${context.message || 'No message provided'}\n${context.detectedEntities?.length > 0 ? `- Mentioned entities: ${context.detectedEntities.map(e => e.name).join(', ')}` : '- No entities mentioned'}`
    }
}

/**
 * Enhance a base prompt with additional context
 * @deprecated Use promptService for all context-aware prompt building.
 */
export function enhancePromptWithContext(basePrompt, context) {
    return basePrompt // Deprecated: use promptService
}

/**
 * Define prompts by category for different contexts
 * @returns {Object} Map of prompt templates by category
 */
export function definePromptCategories() {
    return {
        core: 'core',
        conversation: 'conversation',
        technical: 'technical',
        synthesis: 'synthesis'
    }
}

/**
 * Create a dynamic prompt based on detected entities and context
 * @param {Object} context - The context for prompt creation
 * @param {Array} detectedEntities - Detected entities in the message
 * @returns {Promise<string>} A dynamic system prompt
 */
export async function createDynamicPrompt(context, detectedEntities = []) {
    try {
        const enrichedContext = {
            ...context,
            detectedEntities
        }
        return await promptService.getPromptForContext(enrichedContext)
    } catch (error) {
        log('Error creating dynamic prompt', 'error', error)
        return `You are Echo, NodeByte's fox assistant. Be helpful and knowledgeable.\n\nCurrent context:\n- User: ${context.user?.username || 'User'}\n- Message: ${context.message || 'No message provided'}\n- ${detectedEntities.length > 0 ? `Mentioned entities: ${detectedEntities.map(e => e.name).join(', ')}` : 'No entities mentioned'}`
    }
}
