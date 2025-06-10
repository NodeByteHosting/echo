import { BaseAgent } from './baseAgent.js'
import { db } from '../../database/client.js'
import { memoize } from '../../utils/performanceOptimizer.js'
import { promptService } from '../services/prompt.service.js'
import { knowledgeCache } from '../../utils/cacheManager.js'
import { safeJsonParse, extractJsonFromText } from '../../utils/serialization.js'
import { createRateLimiter } from '../../utils/performanceOptimizer.js'

export class KnowledgeAgent extends BaseAgent {
    constructor(aiModel) {
        super()
        this.aiModel = aiModel
        this.database = db.getInstance()

        // Rate limiting configuration using the utility
        this.rateLimiter = {
            creation: createRateLimiter({
                window: 3600000, // 1 hour in ms
                maxRequests: 10 // Max 10 entries per hour per user
            }),
            rating: createRateLimiter({
                window: 300000, // 5 minutes in ms
                maxRequests: 5 // Max 5 ratings per 5 minutes per user
            })
        }

        // Memoize expensive operations
        this.canHandleMemoized = memoize(this._canHandleImplementation.bind(this))
    }

    async canHandle(message) {
        // Use the memoized version for better performance
        return this.canHandleMemoized(message)
    }

    async _canHandleImplementation(message) {
        // Create context for prompt selection
        const knowledgeContext = await promptService.createContext(message, {
            messageType: 'knowledge_classification'
        })

        // Original implementation but only called when needed
        const response = await this.aiModel.getResponse(
            `Determine if this message is primarily seeking knowledge or information:
Message: "${message}"

Consider:
1. Is it asking for factual information?
2. Does it reference documentation or guides?
3. Is it asking about how something works?
4. Is it seeking definitions or explanations?

Return: true or false`,
            { context: knowledgeContext }
        )

        return response.toLowerCase().includes('true')
    }

    async process(message, userId, contextData) {
        try {
            // Fast path for save requests
            if (message.toLowerCase().includes('save this as:')) {
                return await this.handleSaveRequest(message, userId)
            }

            // Check cache for similar queries using the centralized cache
            const cacheKey = knowledgeCache.generateKey('kb', message)
            const cachedResults = knowledgeCache.get(cacheKey)

            if (cachedResults) {
                console.log('Using cached knowledge results')
                const response = await this.synthesize(message, cachedResults)
                const enhancedResponse = await this.addSaveSuggestionIfRelevant(response, message)

                return {
                    content: enhancedResponse,
                    suggestedTopics: cachedResults.topics || []
                }
            }

            // Continue with original flow but with optimizations
            // Use a simpler prompt for faster analysis
            const queryContext = await this._analyzeQueryFast(message, contextData)

            // Optimize database query - use the knowledge module
            const knowledgeResults = await this.database.knowledge.search(queryContext.topic, {
                tags: queryContext.relatedTopics,
                verified: true,
                limit: 3
            })

            // Cache the results for future use
            knowledgeCache.set(cacheKey, {
                results: knowledgeResults,
                topics: queryContext.relatedTopics
            })

            // Increment use count as a background task, don't await it
            if (knowledgeResults.length > 0) {
                knowledgeResults.forEach(result => {
                    this.database.knowledge.incrementUseCount(result.id).catch(err => {
                        console.error(`Failed to increment use count for entry ${result.id}:`, err)
                    })
                })
            }

            // If not enough knowledge, request research
            if (knowledgeResults.length < 2) {
                return {
                    content:
                        "I don't have enough information about that in my knowledge base yet. Let me research it for you.",
                    needsResearch: true,
                    searchQuery: `${queryContext.topic} ${queryContext.relatedTopics.join(' ')}`
                }
            }

            // Generate response
            const response = await this.synthesize(message, knowledgeResults)

            // Only add save suggestion if it's a substantial response
            let enhancedResponse = response
            if (response.length > 200) {
                enhancedResponse = await this.addSaveSuggestionIfRelevant(response, message)
            }

            return {
                content: enhancedResponse,
                suggestedTopics: queryContext.relatedTopics
            }
        } catch (error) {
            console.error('Knowledge processing error:', error)
            return {
                content:
                    'I encountered an error while processing your knowledge request. Please try again or rephrase your question.'
            }
        }
    }

    /**
     * Faster query analysis with simplified prompt
     */
    async _analyzeQueryFast(message, contextData) {
        // Simple keyword extraction for very fast queries
        const keywords = this._extractKeywords(message)

        if (keywords.length > 0) {
            return {
                topic: keywords[0],
                relatedTopics: keywords.slice(1, 4)
            }
        }

        // Fall back to AI for more complex queries
        try {
            const analysis = await this.aiModel.getResponse({
                message: `Extract the main topic and related topics from this query: "${message}"
Return JSON: {"topic": "main topic", "relatedTopics": ["topic1", "topic2"]}`,
                context: {
                    template: 'analyze_knowledge_request',
                    userContext: contextData
                }
            })

            return safeJsonParse(analysis, {
                topic: message.split(' ').slice(0, 3).join(' '),
                relatedTopics: []
            })
        } catch (error) {
            console.error('Error parsing analysis:', error)
            // Fallback to simpler extraction
            return {
                topic: message.split(' ').slice(0, 3).join(' '),
                relatedTopics: []
            }
        }
    }

    /**
     * Extract keywords from a message
     */
    _extractKeywords(message) {
        const stopWords = [
            'a',
            'an',
            'the',
            'and',
            'or',
            'but',
            'is',
            'are',
            'was',
            'were',
            'to',
            'of',
            'in',
            'for',
            'with',
            'how',
            'what',
            'why',
            'when',
            'where'
        ]

        return message
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.includes(word))
            .slice(0, 5)
    }

    /**
     * Generate a cache key for a query
     */
    _generateCacheKey(message) {
        const normalized = message.toLowerCase().trim().replace(/\s+/g, ' ')
        return `kb:${normalized.substring(0, 100)}`
    }

    /**
     * Increment use counts as a background operation
     */
    async _incrementUseCounts(results) {
        // Update counts in batches to improve performance
        const updatePromises = results.map(entry =>
            this.prisma.knowledgeBase.update({
                where: { id: entry.id },
                data: { useCount: { increment: 1 } },
                select: { id: true } // Minimize returned data
            })
        )

        await Promise.all(updatePromises)
    }

    /**
     * Handle a request to save information to the knowledge base
     * @param {string} message - The user message
     * @param {string} userId - The user ID
     * @returns {Promise<Object>} The response object
     */
    async handleSaveRequest(message, userId) {
        try {
            // Extract the title from "Save this as: [title]"
            const titleMatch = message.match(/save this as:\s*(.+)/i)
            if (!titleMatch || !titleMatch[1]) {
                return {
                    content:
                        'I couldn\'t find a title in your save request. Please use the format: "Save this as: [Title]"'
                }
            }

            const title = titleMatch[1].trim()

            // Get the conversation context to extract content
            // For this implementation, we'll use the message itself as content
            // In a real implementation, you'd retrieve previous messages
            const content = message.replace(/save this as:.+/i, '').trim()

            if (content.length < 50) {
                return {
                    content: "There isn't enough content to save. Please provide more information or context."
                }
            }

            // Analyze the content to determine category and tags
            const analysisPrompt = `Analyze this content for a knowledge base entry:
Content: "${content}"

Extract:
1. Category: One of [general, technical, faq, tutorial, policy, guide]
2. Tags: Up to 5 relevant tags (lowercase, hyphenated)

Return as JSON:
{
  "category": "extracted category",
  "tags": ["tag1", "tag2", ...]
}`

            const analysisResult = await this.aiModel.getResponse(analysisPrompt)
            const analysis = JSON.parse(analysisResult)

            // Save the entry
            try {
                const entry = await this.saveEntry(title, content, analysis.category, analysis.tags, userId)

                return {
                    content: `✅ I've saved that to the knowledge base as "${entry.title}" in the ${entry.category} category.`
                }
            } catch (error) {
                return {
                    content: `I couldn't save that to the knowledge base: ${error.message}`
                }
            }
        } catch (error) {
            console.error('Error handling save request:', error)
            return {
                content:
                    "Sorry, I wasn't able to process that save request. There was an error with the format or validation."
            }
        }
    }

    /**
     * Add a suggestion to save the response if it contains valuable information
     * @param {string} responseContent - The AI's response content
     * @param {string} originalQuery - The original user query
     * @returns {Promise<string>} Enhanced response with save suggestion if relevant
     */
    async addSaveSuggestionIfRelevant(responseContent, originalQuery) {
        if (!responseContent) {
            return "I don't have specific information about that in my knowledge base."
        }

        // Check if this response contains valuable information worth saving
        const checkPrompt = `Determine if this interaction contains valuable technical information worth saving to a knowledge base:
User Query: "${originalQuery}"
Response: "${responseContent}"

Consider:
1. Is this a detailed technical explanation?
2. Does it contain steps, commands, or configurations?
3. Would other users benefit from this information in the future?
4. Is it specific enough to be useful as a reference?

Return: true or false`

        const shouldSave = await this.aiModel.getResponse(checkPrompt)

        if (shouldSave.toLowerCase().includes('true')) {
            // Suggest a title for saving
            const titlePrompt = `Suggest a concise, descriptive title for saving this information to a knowledge base:
Content: "${responseContent}"

Return only the title text, no quotes or explanation.`

            const suggestedTitle = await this.aiModel.getResponse(titlePrompt)

            // Add a suggestion to save at the end of the response
            return `${responseContent}

---
*This information looks useful! To save it to our knowledge base, just reply with:*
"Save this as: ${suggestedTitle}"`
        }

        return responseContent
    }

    // Ensure the synthesize method never returns empty content
    async synthesize(message, results) {
        try {
            // Create context for knowledge synthesis
            const synthesisContext = await promptService.createContext(message, {
                messageType: 'knowledge_synthesis',
                knowledgeResults: results.map(r => ({
                    title: r.title,
                    content: r.content,
                    category: r.category,
                    rating: r.rating
                }))
            })

            const response = await this.aiModel.getResponse(message, {
                context: synthesisContext
            })

            // Fallback if response is empty
            if (!response || response.trim() === '') {
                return "Based on my knowledge base, I found some information but couldn't synthesize a proper response. Please try rephrasing your question."
            }

            return response
        } catch (error) {
            console.error('Error in synthesize:', error)
            return 'I found some information in my knowledge base, but encountered an error while processing it. Please try again.'
        }
    }

    async saveEntry(title, content, category, tags, userId) {
        try {
            // Check rate limit first
            await this.checkRateLimit(userId, 'creation')

            // Validate entry content
            const validationErrors = await this.validateKnowledgeEntry(title, content, category, tags)
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed:\n${validationErrors.join('\n')}`)
            }

            // Check for similar existing entries to prevent duplicates
            const similar = await this.database.knowledge.search(title, {
                limit: 5,
                verified: false // Include unverified entries in similarity check
            })

            if (similar.length > 0) {
                throw new Error(
                    'Similar entries already exist:\n' + similar.map(entry => `- ${entry.title}`).join('\n')
                )
            }

            // Create the entry using the knowledge module
            const entry = await this.database.knowledge.create({
                title,
                content,
                category: category.toLowerCase(),
                tags: tags.map(t => t.toLowerCase()),
                createdBy: BigInt(userId),
                isVerified: false
            })

            // Log the creation for monitoring
            console.log('New knowledge entry created:', {
                id: entry.id,
                title: entry.title,
                category: entry.category,
                creator: userId,
                timestamp: new Date()
            })

            return entry
        } catch (error) {
            console.error('Failed to save knowledge entry:', error)
            throw error
        }
    }

    async verifyEntry(entryId, moderatorId) {
        try {
            return await this.database.knowledge.verify(entryId, moderatorId)
        } catch (error) {
            console.error('Failed to verify entry:', error)
            throw error
        }
    }

    async rateEntry(entryId, rating, userId) {
        try {
            // Rate limit check for ratings
            await this.checkRateLimit(userId, 'rating')

            return await this.database.knowledge.rate(entryId, rating, userId)
        } catch (error) {
            console.error('Failed to rate entry:', error)
            throw error
        }
    }

    /**
     * Check rate limit using the utility
     * @param {string} userId - User ID
     * @param {string} action - Action type (creation, rating)
     * @returns {Promise<boolean>} Whether the action is allowed
     */
    async checkRateLimit(userId, action) {
        const allowed = this.rateLimiter[action](`${userId}-${action}`)

        if (!allowed) {
            throw new Error(`Rate limit exceeded. Please try again later.`)
        }

        return true
    }

    // Content validation utility
    async validateKnowledgeEntry(title, content, category, tags) {
        const errors = []

        // Title validation
        if (!title?.trim()) {
            errors.push('Title is required')
        } else if (title.length < 10) {
            errors.push('Title must be at least 10 characters long')
        } else if (title.length > 200) {
            errors.push('Title must not exceed 200 characters')
        }

        // Content validation
        if (!content?.trim()) {
            errors.push('Content is required')
        } else if (content.length < 50) {
            errors.push('Content must be at least 50 characters long')
        } else if (content.length > 10000) {
            errors.push('Content must not exceed 10000 characters')
        }

        // Category validation
        const validCategories = ['general', 'technical', 'faq', 'tutorial', 'policy', 'guide']
        if (!category || !validCategories.includes(category.toLowerCase())) {
            errors.push(`Category must be one of: ${validCategories.join(', ')}`)
        }

        // Tags validation
        if (!Array.isArray(tags) || tags.length === 0) {
            errors.push('At least one tag is required')
        } else if (tags.length > 10) {
            errors.push('Maximum 10 tags allowed')
        } else {
            const invalidTags = tags.filter(
                tag =>
                    typeof tag !== 'string' ||
                    tag.length < 2 ||
                    tag.length > 30 ||
                    !/^[a-z0-9-]+$/.test(tag.toLowerCase())
            )
            if (invalidTags.length > 0) {
                errors.push('Tags must be 2-30 characters long and contain only letters, numbers, and hyphens')
            }
        }

        // Content quality check using AI
        const qualityCheck = await this.aiModel.getResponse({
            message: `Analyze this knowledge base entry for quality and accuracy:
Title: "${title}"
Content: "${content}"
Category: ${category}
Tags: ${tags.join(', ')}

Consider:
1. Is the content accurate and factual?
2. Is it well-structured and clear?
3. Does it provide value to users?
4. Is it appropriate for the category?
5. Are there any potential issues or concerns?

Return: JSON with isValid (boolean) and issues (array of strings)`,
            context: { template: 'content_validation' }
        })

        const aiCheck = JSON.parse(qualityCheck)
        if (!aiCheck.isValid) {
            errors.push(...aiCheck.issues)
        }

        return errors
    }
}
