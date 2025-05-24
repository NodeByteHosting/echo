import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { aiConfig } from '../configs/ai.config.js'
import { WebSearchTool } from './tools/webSearch.js'
import { MessageHistoryTool } from './tools/messageHistory.js'
import { KnowledgeBaseTool } from './tools/knowledgeBase.js'
import { ContextTool } from './tools/context.js'
import { MessageFormattingTool } from './tools/messageFormatting.js'
import { PerformanceTool } from './tools/performance.js'

export class AIService {
    constructor() {
        this.config = this.normalizeConfig(aiConfig)
        this.webSearch = new WebSearchTool()
        this.messageHistory = new MessageHistoryTool()
        this.knowledgeBase = new KnowledgeBaseTool()
        this.context = new ContextTool()
        this.messageFormatting = new MessageFormattingTool()
        this.performance = new PerformanceTool()

        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured')
        }

        this.model = openai.chat('gpt-4-turbo', {
            compatibility: 'strict'
        })
    }

    normalizeConfig(config) {
        return {
            ...config,
            systemPrompt:
                typeof config.systemPrompt === 'string' ? config.systemPrompt : JSON.stringify(config.systemPrompt)
        }
    }

    async generateResponse(message, userId, contextData = null) {
        try {
            this.performance.startTracking(message.id)

            // Check if this is a response to a context question
            const pendingContext = this.context.getPendingContext(userId)
            if (pendingContext) {
                await this.context.saveUserContext(userId, pendingContext.contextType, message)
                this.context.clearPendingContext(userId)
                return this.generateFullResponse(pendingContext.originalQuestion, userId)
            }

            // Get existing context for user and combine with any new context
            const userContextData = this.context.getUserContext(userId)
            const combinedContext = {
                ...(userContextData || {}),
                ...(contextData || {})
            }

            // Check if we need additional context
            const neededContext = this.context.needsAdditionalContext(message, userId)
            if (neededContext.length > 0 && !contextData) {
                this.context.setPendingContext(userId, message, neededContext[0])
                return this.context.generateContextQuestion(neededContext[0])
            }

            return this.generateFullResponse(message, userId, combinedContext)
        } catch (error) {
            this.performance.recordError('generate_response')
            console.error('Error generating AI response:', error)
            throw error
        } finally {
            const duration = this.performance.endTracking(message.id)
            if (duration) {
                console.log(`Response generated in ${duration.toFixed(2)}ms`)
            }
        }
    }

    async generateFullResponse(message, userId, contextData = null) {
        // Get conversation history
        const history = await this.messageHistory.getRecentHistory(userId)

        // Search knowledge base
        const knowledgeResults = await this.knowledgeBase.searchKnowledge(message)

        // Build enhanced prompt
        const enhancedPrompt = await this.buildEnhancedPrompt(message, contextData, knowledgeResults)

        // Validate prompt before sending
        if (typeof enhancedPrompt !== 'string') {
            throw new Error('Invalid prompt: system prompt must be a string')
        }

        // Prepare messages array with enhanced prompt and history
        const messages = [
            { role: 'system', content: enhancedPrompt },
            ...history.filter(msg => msg && msg.content && typeof msg.content === 'string'),
            { role: 'user', content: message }
        ]
        const { text: fullResponse } = await generateText({
            model: this.model,
            messages,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
            presencePenalty: 0.6,
            frequencyPenalty: 0.5
        })

        // Save both user message and AI response to history
        await this.messageHistory.saveMessage(userId, message, false)
        await this.messageHistory.saveMessage(userId, fullResponse, true)

        // Format the response for Discord
        return this.messageFormatting.formatForDiscord(fullResponse)
    }

    async buildEnhancedPrompt(message, contextData, knowledgeResults) {
        // Ensure we have a string prompt
        let enhancedPrompt = this.config.systemPrompt
        if (typeof enhancedPrompt !== 'string') {
            console.error('System prompt is not a string:', enhancedPrompt)
            enhancedPrompt = 'You are Echo, a helpful AI assistant.'
        }

        if (contextData) {
            enhancedPrompt +=
                '\n\nUser Context:\n' +
                Object.entries(contextData)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n')
        }

        if (knowledgeResults.length > 0) {
            enhancedPrompt +=
                '\n\nRelevant knowledge base entries:\n' +
                knowledgeResults
                    .map(kr => `Topic: ${kr.title}\nCategory: ${kr.category || 'General'}\nContent: ${kr.content}`)
                    .join('\n\n')
        }

        // Perform web search for technical queries
        const webResults =
            message.toLowerCase().includes('how to') ||
            message.toLowerCase().includes('error') ||
            message.toLowerCase().includes('problem')
                ? await this.webSearch.search(message)
                : []

        if (webResults.length > 0) {
            enhancedPrompt += '\n\nRelevant web information:\n' + this.webSearch.formatResults(webResults)
        }

        return enhancedPrompt
    }

    async regenerateResponse(originalMessage) {
        const history = await this.messageHistory.getRecentHistory(originalMessage.author.id)
        const lastUserMessage = history.findLast(msg => msg.role === 'user')?.content

        if (!lastUserMessage) {
            throw new Error('Could not find original message to regenerate')
        }

        return this.generateResponse(lastUserMessage, originalMessage.author.id)
    }

    async refineResponse(originalMessage, refinement) {
        const history = await this.messageHistory.getRecentHistory(originalMessage.author.id)
        const lastResponse = history.findLast(msg => msg.role === 'assistant')?.content

        if (!lastResponse) {
            throw new Error('Could not find response to refine')
        }

        const refinementPrompt = `Please refine your previous response based on this feedback: "${refinement}"\n\nYour previous response was:\n${lastResponse}`
        return this.generateResponse(refinementPrompt, originalMessage.author.id)
    }

    clearUserHistory(userId) {
        this.context.clearUserHistory(userId)
    }
}

// Create and export the singleton instance only
export const aiService = new AIService()
