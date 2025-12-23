import { openai } from '@ai-sdk/openai'
import { aiConfig } from '../../configs/ai.config.js'
import { AIModel } from '../aiModel.js'
import { TechnicalSupportAgent } from '../agents/support.js'
import { ResearchAgent } from '../agents/research.js'
import { KnowledgeAgent } from '../agents/knowledge.js'
import { ConversationAgent } from '../agents/conversation.js'
import { CodeAnalysisAgent } from '../agents/analysis.js'
import { PerformanceTool } from '../tools/performance.js'
import { db } from '../../database/client.js'
import { TicketAgent } from '../agents/ticket.js'
import { makeSerializable } from '../../utils/serialization.js'
import { isPersonaQuery, mentionsPersonaRelationships, createContextForResponse } from '../../utils/personaManager.js'
import { promptService } from './prompt.service.js'

class AIService {
    constructor() {
        // Initialize AI model with wrapper - openai is the provider function
        this.aiModel = new AIModel(openai)
        // Add response cache
        this.responseCache = new Map()
        this.cacheConfig = {
            maxSize: 500,
            ttl: 3600000 // 1 hour cache lifetime
        }
        // Add database reference
        this.database = null
    }

    initialize = async () => {
        // Initialize agents and performance monitoring
        this.conversationAgent = new ConversationAgent(this.aiModel)
        this.knowledgeAgent = new KnowledgeAgent(this.aiModel)
        this.researchAgent = new ResearchAgent(this.aiModel)
        this.supportAgent = new TechnicalSupportAgent(this.aiModel)
        this.analysisAgent = new CodeAnalysisAgent(this.aiModel)
        this.ticketAgent = new TicketAgent(this.aiModel)
        this.performance = new PerformanceTool()

        // Set up agent dependencies
        this.supportAgent.setTicketAgent(this.ticketAgent)

        // Initialize database connection
        this.database = db.getInstance()

        // Initialize prompt service
        await promptService.initialize()

        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured')
        }
    }

    /**
     * Generates a response using the AI model
     * @param {string} prompt - The user's message
     * @param {string} userId - The user's ID
     * @param {Object} contextData - Additional context data
     * @returns {Object} The AI response or error object
     */
    generateResponse = async (prompt, userId, contextData = {}) => {
        let requestId
        try {
            // Record the request for metrics
            this.performance.recordRequest()

            // Update user data in the background
            this._updateUserData(userId, contextData.userInfo).catch(err => {
                console.error('Failed to update user data:', err)
            })

            // Use a unique ID for tracking this request
            requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            this.performance.startTracking(requestId)

            // Prepare context with persona info
            const personaContext = await createContextForResponse(prompt, contextData.guild, {
                id: userId,
                username: contextData.userInfo?.username || 'User',
                displayName: contextData.userInfo?.displayName || 'User'
            })

            // Check if this is a persona-related query first
            if (isPersonaQuery(prompt) || mentionsPersonaRelationships(prompt)) {
                console.log('Detected persona query:', prompt)

                // Create a specialized persona-focused prompt using prompt service
                const personaPromptContext = {
                    ...personaContext,
                    messageType: 'persona',
                    message: prompt
                }
                const personaPrompt = await promptService.getPromptForContext(personaPromptContext)

                // Generate response with the persona prompt
                const response = await this.aiModel.getResponse(prompt, {
                    systemPrompt: personaPrompt
                })

                return {
                    content: response,
                    type: 'persona_response',
                    shouldMention: personaContext.detectedEntities?.length > 0
                }
            }

            // Special handling for specific command patterns
            if (prompt.toLowerCase().startsWith('research:')) {
                // Direct research request, bypass normal routing
                const query = prompt.substring('research:'.length).trim()
                return await this.researchAgent.process(query, userId, {
                    ...contextData,
                    ...personaContext,
                    isDirectResearch: true
                })
            }

            // Check if the prompt mentions specific people from the prompt
            const containsSpecificPerson = personaContext.detectedEntities?.some(e => e.type === 'user')

            if (containsSpecificPerson) {
                // If it mentions a specific person, use entity mentions prompt
                const entityPromptContext = {
                    ...personaContext,
                    messageType: 'entity_mentions',
                    message: prompt
                }
                const entityPrompt = await promptService.getPromptForContext(entityPromptContext)

                // Generate response with the entity mentions prompt
                const response = await this.aiModel.getResponse(prompt, {
                    systemPrompt: entityPrompt,
                    context: personaContext
                })

                return {
                    content: response,
                    type: 'person_mention_response',
                    shouldMention: true,
                    detectedEntities: personaContext.detectedEntities
                }
            }

            // Check if the prompt is a direct request to save knowledge
            if (prompt.toLowerCase().includes('save this as:')) {
                // Handle directly through the knowledge agent
                return await this.knowledgeAgent.handleSaveRequest(prompt, userId)
            }

            // Check if this is a followup to a conversation that needed research
            if (contextData.needsResearch === true && contextData.previousResponse) {
                // Continue research flow from previous response
                return await this._continueResearchFlow(prompt, userId, {
                    ...contextData,
                    ...personaContext
                })
            }

            // Use a better classification approach with our new agents
            const messageType = await this._classifyMessageIntent(prompt)

            // Add message type to context for prompt selection
            const enrichedContext = {
                ...contextData,
                ...personaContext,
                messageType
            }

            // Enhanced routing based on intent
            switch (messageType) {
                case 'ticket':
                    return this.ticketAgent.process(prompt, userId, enrichedContext)

                case 'knowledge':
                    // For knowledge requests, consider if research is needed
                    const knowledgeResponse = await this.knowledgeAgent.process(prompt, userId, enrichedContext)

                    if (knowledgeResponse.needsResearch) {
                        // Get research results
                        const researchResults = await this.researchAgent.process(
                            knowledgeResponse.searchQuery || prompt,
                            userId,
                            enrichedContext
                        )

                        // Add research to context and retry
                        return await this.knowledgeAgent.process(prompt, userId, {
                            ...enrichedContext,
                            researchResults: researchResults.content,
                            sourceResults: researchResults.sourceResults
                        })
                    }

                    return knowledgeResponse

                case 'code':
                    return this.analysisAgent.process(prompt, userId, enrichedContext)

                case 'support':
                    // For support requests, check if we need external research
                    const supportResponse = await this.supportAgent.process(prompt, userId, enrichedContext)

                    if (supportResponse.needsResearch) {
                        // Get research results
                        const researchResults = await this.researchAgent.process(
                            supportResponse.searchQuery || prompt,
                            userId,
                            enrichedContext
                        )

                        // Add research to context and retry
                        return await this.supportAgent.process(prompt, userId, {
                            ...enrichedContext,
                            researchResults: researchResults.content,
                            sourceResults: researchResults.sourceResults
                        })
                    }

                    return supportResponse

                case 'research':
                    // Direct research intent detected
                    return await this.researchAgent.process(prompt, userId, enrichedContext)

                case 'conversation':
                    // For general conversation, check if we should research in the background
                    const shouldResearch = await this._shouldPerformBackgroundResearch(prompt)

                    if (shouldResearch) {
                        // Start background research (don't await)
                        this._performBackgroundResearch(prompt, userId, enrichedContext).catch(err => {
                            console.error('Background research failed:', err)
                        })
                    }

                    return this.conversationAgent.process(prompt, userId, enrichedContext)
            }

            // Fallback to full agent selection process
            return await this._fullAgentSelection(prompt, userId, enrichedContext)
        } catch (error) {
            this.performance.recordError('generate_response')

            // Create a safe error object without BigInt values that can't be serialized
            const safeError = {
                message: error.message,
                name: error.name,
                stack: error.stack
            }

            console.error('Error generating AI response:', safeError)
            throw error
        } finally {
            // Make sure requestId is defined before using it
            if (requestId) {
                const duration = this.performance.endTracking(requestId)
                console.log(`AI response generated in ${duration}ms`)
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

    /**
     * Quick classification of request type to avoid full agent selection
     * @param {string} prompt - The user prompt
     * @returns {Promise<string>} The likely agent type
     */
    _quickClassifyRequest = async prompt => {
        // Simple pattern matching for faster classification
        const lowerPrompt = prompt.toLowerCase()

        // Knowledge request patterns
        if (
            lowerPrompt.includes('how to') ||
            lowerPrompt.includes('what is') ||
            lowerPrompt.includes('explain') ||
            lowerPrompt.includes('guide')
        ) {
            return 'knowledge'
        }

        // Support request patterns
        if (
            lowerPrompt.includes('error') ||
            lowerPrompt.includes('not working') ||
            lowerPrompt.includes('issue') ||
            lowerPrompt.includes('problem') ||
            lowerPrompt.includes('help me')
        ) {
            return 'support'
        }

        // Code analysis patterns
        if (
            lowerPrompt.includes('code') ||
            lowerPrompt.includes('function') ||
            lowerPrompt.includes('script') ||
            lowerPrompt.includes('optimize') ||
            prompt.includes('```')
        ) {
            return 'code'
        }

        // Ticket patterns
        if (
            lowerPrompt.includes('ticket') ||
            lowerPrompt.includes('support request') ||
            lowerPrompt.includes('help desk')
        ) {
            return 'ticket'
        }

        // Default - needs full classification
        return 'unknown'
    }

    /**
     * Full agent selection process (slower but more accurate)
     */
    _fullAgentSelection = async (prompt, userId, contextData) => {
        // Try each agent in priority order
        const agents = [
            this.ticketAgent,
            this.supportAgent,
            this.analysisAgent,
            this.knowledgeAgent,
            this.researchAgent,
            this.conversationAgent
        ]

        for (const agent of agents) {
            if (await agent.canHandle(prompt)) {
                // Process with the selected agent
                const response = await agent.process(prompt, userId, contextData)

                // Check if research is needed for this response
                if (response.needsResearch) {
                    // Remember the original intent for future context
                    const originalIntent =
                        agent === this.knowledgeAgent
                            ? 'knowledge'
                            : agent === this.supportAgent
                              ? 'support'
                              : 'conversation'

                    // Get research results
                    const researchResults = await this.researchAgent.process(response.searchQuery || prompt, userId)

                    // Add research to context and retry with the same agent
                    return agent.process(prompt, userId, {
                        ...contextData,
                        researchResults: researchResults.content,
                        sourceResults: researchResults.sourceResults,
                        originalIntent,
                        previousResponse: response
                    })
                }

                return response
            }
        }

        // If no specialized agent can handle it, use conversation agent as fallback
        return this.conversationAgent.process(prompt, userId, contextData)
    }

    /**
     * Generate a cache key for responses
     */
    _generateCacheKey = (prompt, context) => {
        // Normalize prompt by trimming, lowercasing, and removing extra spaces
        const normalizedPrompt = prompt.trim().toLowerCase().replace(/\s+/g, ' ')

        // Don't cache complex or personalized queries
        if (
            prompt.length > 150 ||
            context.personalData ||
            normalizedPrompt.includes('my ') ||
            normalizedPrompt.includes('I ')
        ) {
            return null
        }

        // Create a stable key from the normalized prompt
        return `response:${normalizedPrompt}`
    }

    /**
     * Get a cached response if available and valid
     */
    _getCachedResponse = cacheKey => {
        if (!cacheKey) {
            return null
        }

        const cached = this.responseCache.get(cacheKey)
        if (!cached) {
            this.performance.recordCacheMiss()
            return null
        }

        // Check if cache entry is still valid
        if (Date.now() - cached.timestamp > this.cacheConfig.ttl) {
            this.responseCache.delete(cacheKey)
            this.performance.recordCacheMiss()
            return null
        }

        this.performance.recordCacheHit()
        return cached.response
    }

    /**
     * Cache a response for future use
     */
    _cacheResponse = (cacheKey, response) => {
        if (!cacheKey) {
            return
        }

        // Enforce cache size limit
        if (this.responseCache.size >= this.cacheConfig.maxSize) {
            // Remove oldest entry
            const oldestKey = [...this.responseCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0]
            this.responseCache.delete(oldestKey)
            this.performance.recordCacheEviction()
        }

        this.responseCache.set(cacheKey, {
            response,
            timestamp: Date.now()
        })
    }

    /**
     * Update user data in the database
     * @param {string} userId - The user ID
     * @param {Object} userInfo - Additional user information
     * @private
     */
    _updateUserData = async (userId, userInfo = {}) => {
        try {
            if (!userId) {
                return
            }

            // Check if user exists - use safe serialization for logs
            // FIX: Don't provide any options to findByDiscordId to avoid query issues
            const existingUser = await this.database.users.findByDiscordId(userId)

            if (!existingUser) {
                // Create basic user record if not exists
                const safeUserInfo = makeSerializable(userInfo)
                await this.database.users.upsertDiscordUser({
                    id: userId,
                    username: safeUserInfo?.username || `user_${userId.substring(userId.length - 6)}`,
                    displayName: safeUserInfo?.displayName,
                    avatar: safeUserInfo?.avatar
                })
            }
        } catch (error) {
            console.error('Error updating user data:', error)
        }
    }

    /**
     * Continue a research flow from a previous response
     * @private
     */
    _continueResearchFlow = async (prompt, userId, contextData) => {
        // Determine if this is a refinement or follow-up question
        const isRefinement = await this.aiModel.getResponse(`
            Determine if this is a refinement/clarification of the previous research request:
            Previous query: "${contextData.previousResponse.searchQuery || 'Unknown'}"
            Current message: "${prompt}"
            
            Return ONLY: "refinement" or "new_question"
        `)

        if (isRefinement.toLowerCase().includes('refinement')) {
            // Combine the previous query with the refinement
            const combinedQuery = `${contextData.previousResponse.searchQuery} ${prompt}`

            // Get new research results
            const researchResults = await this.researchAgent.process(combinedQuery, userId)

            // Process with the most appropriate agent based on the original intent
            if (contextData.originalIntent === 'knowledge') {
                return await this.knowledgeAgent.process(prompt, userId, {
                    ...contextData,
                    researchResults: researchResults.content,
                    sourceResults: researchResults.sourceResults,
                    isRefinedResearch: true
                })
            } else if (contextData.originalIntent === 'support') {
                return await this.supportAgent.process(prompt, userId, {
                    ...contextData,
                    researchResults: researchResults.content,
                    sourceResults: researchResults.sourceResults,
                    isRefinedResearch: true
                })
            }
            // Default to conversation agent with research context
            return await this.conversationAgent.process(prompt, userId, {
                ...contextData,
                researchResults: researchResults.content,
                sourceResults: researchResults.sourceResults,
                isRefinedResearch: true
            })
        }
        // This is a new question, process normally
        return this._fullAgentSelection(prompt, userId, contextData)
    }

    /**
     * Determine if background research would be helpful
     * @private
     */
    _shouldPerformBackgroundResearch = async prompt => {
        // Very fast heuristic check first
        const researchKeywords = ['how to', 'what is', 'explain', 'why does', 'what are', 'when was']
        if (researchKeywords.some(kw => prompt.toLowerCase().includes(kw))) {
            // For longer, complex questions that contain research keywords, get AI to confirm
            if (prompt.length > 50) {
                const needsResearch = await this.aiModel.getResponse(`
                    Quick check: Would this message benefit from background web research?
                    Message: "${prompt}"
                    
                    Return ONLY: "yes" or "no"
                `)
                return needsResearch.toLowerCase().includes('yes')
            }
            return true
        }
        return false
    }

    /**
     * Perform background research without blocking the response
     * @private
     */
    _performBackgroundResearch = async (prompt, userId) => {
        try {
            // Start research in the background
            const researchResults = await this.researchAgent.process(prompt, userId)

            // Store the results for potential future use
            this._cacheResearchResults(userId, prompt, researchResults)

            // Log completion of background research
            console.log(`Background research completed for user ${userId}`)
        } catch (error) {
            console.error('Background research failed:', error)
        }
    }

    /**
     * Cache research results for potential future use
     * @private
     */
    _cacheResearchResults = (userId, query, results) => {
        // Generate a cache key
        const key = `research:${userId}:${query.substring(0, 50)}`

        // Store in response cache with research-specific metadata
        this._cacheResponse(key, {
            ...results,
            isResearchResult: true,
            timestamp: Date.now()
        })
    }

    /**
     * Classify the intent/type of a message
     * @param {string} message - The message to classify
     * @returns {Promise<string>} The message type/intent
     * @private
     */
    _classifyMessageIntent = async message => {
        // Quick checks for obvious patterns (no AI call needed)
        const msg = message.toLowerCase()

        // Add research pattern check
        if (
            (msg.includes('research') && (msg.includes('find') || msg.includes('search'))) ||
            msg.startsWith('look up') ||
            msg.startsWith('search for') ||
            msg.includes('find information about')
        ) {
            return 'research'
        }

        // Ticket pattern check
        if (
            msg.includes('ticket') ||
            msg.includes('support request') ||
            msg.includes('help desk') ||
            (msg.includes('help') && msg.includes('staff')) ||
            (msg.includes('urgent') && (msg.includes('issue') || msg.includes('problem')))
        ) {
            return 'ticket'
        }

        // Code pattern check
        if (
            message.includes('```') ||
            (msg.includes('function') && msg.includes('{')) ||
            (msg.includes('class') && msg.includes('{')) ||
            (msg.includes('const') && msg.includes('=')) ||
            (msg.includes('var') && msg.includes('='))
        ) {
            return 'code'
        }

        // Support pattern check - this is more general technical help, not necessarily a ticket
        if (
            (msg.includes('error') ||
                msg.includes('issue') ||
                msg.includes('problem') ||
                msg.includes('not working')) &&
            (msg.includes('help') || msg.includes('fix') || msg.includes('solve'))
        ) {
            return 'support'
        }

        // Knowledge pattern check
        if (
            msg.includes('how to') ||
            msg.includes('what is') ||
            msg.includes('explain') ||
            msg.includes('guide') ||
            msg.includes('tutorial')
        ) {
            return 'knowledge'
        }

        // For simple/short messages, default to conversation without AI call
        if (message.length < 50 || msg.match(/^(hi|hello|hey|thanks|ok|yes|no|sure)\b/)) {
            return 'conversation'
        }

        // Only use AI for complex/ambiguous cases - this reduces API calls significantly
        try {
            const classification = await this.aiModel.getResponse(`Classify this message into one of these categories:
Message: "${message}"

Categories:
1. ticket - specifically requesting to create a support ticket or needing staff help
2. knowledge - seeking general information, explanations, or documentation
3. support - reporting issues or technical problems that need assistance
4. code - sharing or asking about code snippets, programming questions
5. research - explicitly asking for research or external information lookup
6. conversation - general chat, greetings, personal interaction

First, consider if this is a research request - look for:
- Explicit mentions of searching, researching, or finding information
- Questions that would require external knowledge or recent information
- Requests for statistics, definitions, or factual information

Return ONLY the category name with no explanation.`)

            // Clean and normalize the response
            const cleanClassification = classification.toLowerCase().trim()
            if (cleanClassification.includes('research')) {
                return 'research'
            }
            if (cleanClassification.includes('ticket')) {
                return 'ticket'
            }
            if (cleanClassification.includes('knowledge')) {
                return 'knowledge'
            }
            if (cleanClassification.includes('support')) {
                return 'support'
            }
            if (cleanClassification.includes('code')) {
                return 'code'
            }
            if (cleanClassification.includes('conversation')) {
                return 'conversation'
            }

            // Default to conversation for unclassified messages
            return 'conversation'
        } catch (error) {
            console.error('Error classifying message:', error)
            return 'conversation' // Safe default
        }
    }

    /**
     * Check if the prompt mentions specific people from the prompt
     * @param {string} prompt - The user's message
     * @returns {boolean} Whether the prompt mentions specific people
     * @private
     */
    _checkForSpecificPerson(prompt) {
        const normalizedPrompt = prompt.toLowerCase()

        // Check for people mentioned in the system prompt
        const peopleToCheck = [
            'pixel',
            'codemeapixel',
            'exa',
            'callmeabyte',
            'indie',
            'indieonpawtrol',
            'connor',
            'connor200024',
            'harley',
            'harley200317',
            'rizon',
            'rizonftw',
            'rootspring',
            'select',
            'ranveersoni',
            'quin',
            'purrquinox'
        ]

        // More aggressive checking for direct questions about people
        if (
            normalizedPrompt.includes('what do you think of') ||
            normalizedPrompt.includes('tell me about') ||
            normalizedPrompt.includes('opinion on')
        ) {
            return peopleToCheck.some(person => normalizedPrompt.includes(person))
        }

        return peopleToCheck.some(person => normalizedPrompt.includes(person))
    }

    /**
     * Determines if Echo should mention detected people
     * @param {string} message - The user's message
     * @param {Array} detectedPeople - Array of detected people
     * @returns {Promise<boolean>} Whether Echo should mention them
     * @private
     */
    _shouldMentionPeople = async (message, detectedPeople) => {
        if (!detectedPeople || detectedPeople.length === 0) {
            return false
        }

        // Only consider people who were found in the guild
        const mentionable = detectedPeople.filter(p => p.foundInGuild)
        if (mentionable.length === 0) {
            return false
        }

        // Echo has no filter - if we detected someone valid in the guild, PING THEM!
        console.log(
            `🦊 AI Service: Found ${mentionable.length} people to mention: ${mentionable.map(p => p.name).join(', ')}`
        )

        // For direct questions, always mention
        if (mentionable.some(p => p.isDirect)) {
            console.log(`🦊 AI Service: Direct question detected, will definitely mention`)
            return true
        }

        // For general mentions, let's still mention them
        console.log(`🦊 AI Service: General mention detected, will mention anyway because Echo has no filter`)
        return true
    }
}

// Create a singleton instance
const aiServiceInstance = new AIService()

// Export the singleton
export { aiServiceInstance as aiService }
