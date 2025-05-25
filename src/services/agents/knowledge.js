import { BaseAgent } from './baseAgent.js'
import { PrismaClient } from '@prisma/client'

export class KnowledgeAgent extends BaseAgent {
    constructor(aiModel) {
        super()
        this.aiModel = aiModel
        this.prisma = new PrismaClient()

        // Rate limiting configuration
        this.rateLimits = {
            creation: {
                window: 3600000, // 1 hour in ms
                maxRequests: 10 // Max 10 entries per hour per user
            },
            rating: {
                window: 300000, // 5 minutes in ms
                maxRequests: 5 // Max 5 ratings per 5 minutes per user
            }
        }

        // Cache for rate limiting
        this.requestCounts = new Map()
    }

    async canHandle(message) {
        // Let AI determine if this is a knowledge-based query
        const response = await this.aiModel
            .getResponse(`Determine if this message is primarily seeking knowledge or information:
Message: "${message}"

Consider:
1. Is it asking for factual information?
2. Does it reference documentation or guides?
3. Is it asking about how something works?
4. Is it seeking definitions or explanations?

Return: true or false`)

        return response.toLowerCase().includes('true')
    }

    async process(message, userId, contextData) {
        try {
            const analysis = await this.aiModel.getResponse({
                message,
                context: {
                    template: 'analyze_knowledge_request',
                    userContext: contextData
                }
            })

            const queryContext = JSON.parse(analysis)

            const knowledgeResults = await this.prisma.knowledgeBase.findMany({
                where: {
                    OR: [
                        { title: { contains: queryContext.topic, mode: 'insensitive' } },
                        { content: { contains: queryContext.topic, mode: 'insensitive' } },
                        { tags: { hasSome: queryContext.relatedTopics } }
                    ],
                    isVerified: true
                },
                orderBy: [{ useCount: 'desc' }, { rating: 'desc' }],
                take: 3
            })

            // Increment use count for found entries
            await Promise.all(
                knowledgeResults.map(entry =>
                    this.prisma.knowledgeBase.update({
                        where: { id: entry.id },
                        data: { useCount: { increment: 1 } }
                    })
                )
            )

            // If not enough knowledge, request research
            if (knowledgeResults.length < 2) {
                return {
                    content: null,
                    needsResearch: true,
                    searchQuery: `${queryContext.topic} ${queryContext.relatedTopics.join(' ')}`
                }
            }

            const response = await this.synthesize(message, knowledgeResults)

            return {
                content: response,
                suggestedTopics: queryContext.relatedTopics
            }
        } catch (error) {
            console.error('Knowledge processing error:', error)
            throw error
        }
    }

    async synthesize(message, results) {
        return await this.aiModel.getResponse({
            message,
            context: {
                knowledgeResults: results.map(r => ({
                    title: r.title,
                    content: r.content,
                    category: r.category,
                    rating: r.rating
                })),
                template: 'knowledge_synthesis'
            }
        })
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
            const similar = await this.prisma.knowledgeBase.findMany({
                where: {
                    OR: [
                        { title: { contains: title, mode: 'insensitive' } },
                        { content: { contains: content.substring(0, 100), mode: 'insensitive' } }
                    ]
                },
                select: { id: true, title: true }
            })

            if (similar.length > 0) {
                throw new Error(
                    'Similar entries already exist:\n' + similar.map(entry => `- ${entry.title}`).join('\n')
                )
            }

            // Create the entry
            const entry = await this.prisma.knowledgeBase.create({
                data: {
                    title,
                    content,
                    category: category.toLowerCase(),
                    tags: tags.map(t => t.toLowerCase()),
                    createdBy: BigInt(userId),
                    metadata: {
                        wordCount: content.split(/\s+/).length,
                        createdAt: new Date(),
                        lastUpdated: new Date(),
                        version: 1
                    }
                }
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
            return await this.prisma.knowledgeBase.update({
                where: { id: entryId },
                data: {
                    isVerified: true,
                    verifiedBy: BigInt(moderatorId),
                    verifiedAt: new Date()
                }
            })
        } catch (error) {
            console.error('Failed to verify entry:', error)
            throw error
        }
    }

    async rateEntry(entryId, rating, userId) {
        try {
            // Rate limit check for ratings
            await this.checkRateLimit(userId, 'rating')

            const entry = await this.prisma.knowledgeBase.findUnique({
                where: { id: entryId },
                select: {
                    rating: true,
                    ratingCount: true
                }
            })

            if (!entry) {
                throw new Error('Entry not found')
            }

            const newRating =
                entry.ratingCount > 0 ? (entry.rating * entry.ratingCount + rating) / (entry.ratingCount + 1) : rating

            return await this.prisma.knowledgeBase.update({
                where: { id: entryId },
                data: {
                    rating: newRating,
                    ratingCount: { increment: 1 }
                }
            })
        } catch (error) {
            console.error('Failed to rate entry:', error)
            throw error
        }
    }

    // Rate limiting utility
    async checkRateLimit(userId, action) {
        const now = Date.now()
        const key = `${userId}-${action}`
        const limit = this.rateLimits[action]

        if (!this.requestCounts.has(key)) {
            this.requestCounts.set(key, [])
        }

        const requests = this.requestCounts.get(key)
        const validRequests = requests.filter(time => now - time < limit.window)
        this.requestCounts.set(key, validRequests)

        if (validRequests.length >= limit.maxRequests) {
            const oldestRequest = Math.min(...validRequests)
            const timeToWait = Math.ceil((limit.window - (now - oldestRequest)) / 1000)
            throw new Error(`Rate limit exceeded. Please try again in ${timeToWait} seconds.`)
        }

        validRequests.push(now)
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
