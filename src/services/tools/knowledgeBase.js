import { PrismaClient } from '@prisma/client'

export class KnowledgeBaseTool {
    constructor() {
        this.prisma = new PrismaClient()
    }
    async searchKnowledge(query) {
        try {
            // Search through knowledge base entries
            const relevantEntries = await this.prisma.knowledgeBase.findMany({
                where: {
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { content: { contains: query, mode: 'insensitive' } },
                        { tags: { hasSome: query.toLowerCase().split(/\s+/) } }
                    ],
                    isVerified: true
                },
                orderBy: [{ useCount: 'desc' }, { rating: 'desc' }],
                take: 3
            })

            // Increment use count for found entries
            await Promise.all(
                relevantEntries.map(entry =>
                    this.prisma.knowledgeBase.update({
                        where: { id: entry.id },
                        data: { useCount: { increment: 1 } }
                    })
                )
            )

            return relevantEntries.map(entry => ({
                title: entry.title,
                content: entry.content,
                category: entry.category,
                rating: entry.rating
            }))
        } catch (error) {
            console.error('Knowledge base search error:', error)
            return []
        }
    }

    async saveEntry(title, content, category, tags, userId) {
        try {
            return await this.prisma.knowledgeBase.create({
                data: {
                    title,
                    content,
                    category,
                    tags: tags.map(t => t.toLowerCase()),
                    createdBy: BigInt(userId)
                }
            })
        } catch (error) {
            console.error('Failed to save knowledge base entry:', error)
            throw error
        }
    }

    async rateEntry(entryId, rating, userId) {
        try {
            const entry = await this.prisma.knowledgeBase.findUnique({
                where: { id: entryId }
            })

            if (!entry) {
                throw new Error('Knowledge base entry not found')
            }

            // Update rating (simple average)
            const newRatingCount = entry.ratingCount + 1
            const newRating = (entry.rating * entry.ratingCount + rating) / newRatingCount

            return await this.prisma.knowledgeBase.update({
                where: { id: entryId },
                data: {
                    rating: newRating,
                    ratingCount: newRatingCount
                }
            })
        } catch (error) {
            console.error('Failed to rate knowledge base entry:', error)
            throw error
        }
    }

    async verifyEntry(entryId, moderatorId) {
        try {
            return await this.prisma.knowledgeBase.update({
                where: { id: entryId },
                data: { isVerified: true }
            })
        } catch (error) {
            console.error('Failed to verify knowledge base entry:', error)
            throw error
        }
    }

    async getPopularEntries(category = null, limit = 10) {
        try {
            return await this.prisma.knowledgeBase.findMany({
                where: category ? { category } : undefined,
                orderBy: [{ useCount: 'desc' }, { rating: 'desc' }],
                take: limit
            })
        } catch (error) {
            console.error('Failed to get popular entries:', error)
            return []
        }
    }
}
