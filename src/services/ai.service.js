import { openai } from '@ai-sdk/openai'
import { aiConfig } from '../configs/ai.config.js'
import { AIModel } from './aiModel.js'
import { TechnicalSupportAgent } from './agents/support.js'
import { ResearchAgent } from './agents/research.js'
import { KnowledgeAgent } from './agents/knowledge.js'
import { ConversationAgent } from './agents/conversation.js'
import { CodeAnalysisAgent } from './agents/analysis.js'
import { PerformanceTool } from './tools/performance.js'

class AIService {
    constructor() {
        // Initialize AI model with wrapper - openai is the provider function
        this.aiModel = new AIModel(openai)
    }

    initialize = () => {
        // Initialize agents and performance monitoring
        this.conversationAgent = new ConversationAgent(this.aiModel)
        this.knowledgeAgent = new KnowledgeAgent(this.aiModel)
        this.researchAgent = new ResearchAgent(this.aiModel)
        this.supportAgent = new TechnicalSupportAgent(this.aiModel)
        this.analysisAgent = new CodeAnalysisAgent(this.aiModel)
        this.performance = new PerformanceTool()

        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured')
        }
    }

    generateResponse = async (message, userId, contextData = null) => {
        try {
            this.performance.startTracking(message.id)

            // Try each agent in priority order
            const agents = [this.supportAgent, this.analysisAgent, this.knowledgeAgent, this.conversationAgent]

            for (const agent of agents) {
                if (await agent.canHandle(message)) {
                    // For knowledge and support agents, check if research is needed
                    if (agent === this.knowledgeAgent || agent === this.supportAgent) {
                        const agentResponse = await agent.process(message, userId, contextData)

                        if (agentResponse.needsResearch) {
                            // Get research results
                            const researchResults = await this.researchAgent.process(agentResponse.searchQuery)

                            // Add research to context
                            const enhancedContext = {
                                ...contextData,
                                researchResults: researchResults.content,
                                sourceResults: researchResults.sourceResults
                            }

                            // Retry with research results
                            return agent.process(message, userId, enhancedContext)
                        }

                        return agentResponse
                    }

                    return agent.process(message, userId, contextData)
                }
            }

            // If no specialized agent can handle it, use conversation agent as fallback
            return this.conversationAgent.process(message, userId, contextData)
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

    regenerateResponse = async (message, contextData = null) => {
        // Add a flag to indicate this is a regeneration request
        const enhancedContext = {
            ...contextData,
            isRegeneration: true,
            originalMessage: message.content
        }

        return this.generateResponse(message.content, message.author.id, enhancedContext)
    }

    clearUserHistory = async userId => {
        // Use conversation agent to clear user history
        return this.conversationAgent.clearHistory(userId)
    }

    saveToKnowledgeBase = async (message, userId) => {
        // Extract title from first line or generate one
        const title = message.content.split('\n')[0].slice(0, 100)

        // Use knowledge agent to save the entry
        return this.knowledgeAgent.saveEntry(
            title,
            message.content,
            'conversation', // Default category
            ['discord', 'chat'], // Default tags
            userId
        )
    }

    validateAgentResponse = response => {
        // Common response validation
        if (!response || typeof response !== 'object') {
            throw new Error('Invalid agent response format')
        }

        // Required fields for all responses
        if (!('content' in response)) {
            throw new Error('Agent response missing content field')
        }

        // Optional fields validation
        if ('needsResearch' in response && typeof response.needsResearch !== 'boolean') {
            throw new Error('needsResearch must be a boolean')
        }

        if ('error' in response && typeof response.error !== 'string') {
            throw new Error('error must be a string')
        }

        if ('searchQuery' in response && typeof response.searchQuery !== 'string') {
            throw new Error('searchQuery must be a string')
        }

        return true
    }
}

export const aiService = new AIService()
