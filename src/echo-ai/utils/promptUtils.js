/**
 * Utilities for handling AI prompts
 */
import { promptService } from '../services/prompt.service.js'
import { log } from '../../functions/logger.js'

/**
 * Process a template string with variables
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} context - Context object with variables
 * @returns {string} Processed template
 */
export function processTemplate(template, context = {}) {
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
 * Get prompt for a specific message type
 * @param {string} message - User message
 * @param {string} messageType - Type of message/prompt to use
 * @param {Object} context - Additional context
 * @returns {Promise<string>} Processed prompt
 */
export async function getPromptForMessage(message, messageType, context = {}) {
    try {
        const promptContext = await promptService.createContext(message, {
            ...context,
            messageType,
            message
        })

        return await promptService.getPromptForContext(promptContext)
    } catch (error) {
        log('Error getting prompt for message', 'error', error)
        // Fallback to default prompt
        return `You are Echo, NodeByte's fox assistant. Be helpful and knowledgeable.

User message: ${message}

Respond in a helpful, accurate way while maintaining Echo's direct and slightly snarky personality.`
    }
}

/**
 * Optimize a prompt for token usage
 * @param {string} prompt - Original prompt
 * @param {number} maxLength - Maximum desired length
 * @returns {string} Optimized prompt
 */
export function optimizePrompt(prompt, maxLength = 8000) {
    if (!prompt) {
        return prompt
    }

    // Handle non-string prompts
    if (typeof prompt !== 'string') {
        return String(prompt)
    }

    // Remove redundant whitespace
    let optimized = prompt.trim().replace(/\s+/g, ' ')

    // Truncate extremely long prompts
    if (optimized.length > maxLength) {
        optimized = optimized.substring(0, maxLength) + '\n[Note: The prompt was truncated due to length.]'
    }

    return optimized
}

/**
 * Create a set of common prompt templates for different contexts
 * @returns {Object} Map of prompt templates by category and type
 */
export function getPromptTemplateMap() {
    return {
        general: {
            default: 'default',
            dm: 'dm',
            persona: 'persona',
            entity_mentions: 'entity_mentions'
        },
        technical: {
            default: 'technical',
            support: 'technical_support',
            code: 'code_analysis'
        },
        knowledge: {
            default: 'knowledge_synthesis',
            research: 'research_synthesis',
            query: 'knowledge_query'
        },
        conversation: {
            default: 'conversation',
            sentiment: 'sentiment_analysis',
            classification: 'classification'
        }
    }
}
