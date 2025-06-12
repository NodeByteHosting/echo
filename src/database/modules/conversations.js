export class ConversationModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async getHistory(userId, limit = 10) {
        return this.prisma.conversationHistory.findMany({
            where: { userId: BigInt(userId) },
            orderBy: { timestamp: 'desc' },
            take: limit
        })
    }

    async addEntry(userId, content, isAiResponse = false) {
        return this.prisma.conversationHistory.create({
            data: {
                userId: BigInt(userId),
                content,
                isAiResponse,
                timestamp: new Date()
            }
        })
    }

    async clearHistory(userId) {
        return this.prisma.conversationHistory.deleteMany({
            where: { userId: BigInt(userId) }
        })
    }

    async getRecentConversations(limit = 20) {
        // Get unique user IDs from recent conversations
        const recentUsers = await this.prisma.conversationHistory.findMany({
            select: { userId: true },
            distinct: ['userId'],
            orderBy: { timestamp: 'desc' },
            take: limit
        })

        // For each user, get their most recent conversation
        const results = []
        for (const { userId } of recentUsers) {
            const latestMessage = await this.prisma.conversationHistory.findFirst({
                where: { userId },
                orderBy: { timestamp: 'desc' },
                include: { user: true }
            })

            if (latestMessage) {
                results.push(latestMessage)
            }
        }

        return results
    }

    async findByContent(content, limit = 10) {
        return this.prisma.conversationHistory.findMany({
            where: {
                content: {
                    contains: content,
                    mode: 'insensitive'
                }
            },
            orderBy: { timestamp: 'desc' },
            take: limit,
            include: { user: true }
        })
    }

    /**
     * Get conversation entry by ID
     * @param {number} id - Conversation entry ID
     * @returns {Promise<Object|null>} Entry or null
     */
    async getById(id) {
        return this.prisma.conversationHistory.findUnique({
            where: { id },
            include: { user: true }
        })
    }

    /**
     * Update a conversation entry
     * @param {number} id - Entry ID
     * @param {Object} data - Fields to update
     * @returns {Promise<Object>} Updated entry
     */
    async updateEntry(id, data) {
        return this.prisma.conversationHistory.update({
            where: { id },
            data,
            include: { user: true }
        })
    }

    /**
     * Delete a conversation entry
     * @param {number} id - Entry ID
     * @returns {Promise<Object>} Deleted entry
     */
    async deleteEntry(id) {
        return this.prisma.conversationHistory.delete({
            where: { id }
        })
    }

    /**
     * Batch delete conversation entries by IDs
     * @param {Array<number>} ids
     * @returns {Promise<Object>} Result
     */
    async batchDelete(ids) {
        return this.prisma.conversationHistory.deleteMany({
            where: { id: { in: ids } }
        })
    }

    /**
     * Get all AI responses for a user
     * @param {BigInt|number|string} userId
     * @param {number} limit
     * @returns {Promise<Array>} List of AI responses
     */
    async getAiResponses(userId, limit = 10) {
        return this.prisma.conversationHistory.findMany({
            where: {
                userId: BigInt(userId),
                isAiResponse: true
            },
            orderBy: { timestamp: 'desc' },
            take: limit,
            include: { user: true }
        })
    }

    /**
     * Get conversation entries by date range
     * @param {BigInt|number|string} userId
     * @param {Date} start
     * @param {Date} end
     * @param {number} limit
     * @returns {Promise<Array>} List of entries
     */
    async getByDateRange(userId, start, end, limit = 20) {
        return this.prisma.conversationHistory.findMany({
            where: {
                userId: BigInt(userId),
                timestamp: {
                    gte: new Date(start),
                    lte: new Date(end)
                }
            },
            orderBy: { timestamp: 'desc' },
            take: limit,
            include: { user: true }
        })
    }

    /**
     * Get conversation statistics for a user
     * @param {BigInt|number|string} userId
     * @returns {Promise<Object>} Stats
     */
    async getStats(userId) {
        const total = await this.prisma.conversationHistory.count({ where: { userId: BigInt(userId) } })
        const aiResponses = await this.prisma.conversationHistory.count({
            where: { userId: BigInt(userId), isAiResponse: true }
        })
        return { total, aiResponses }
    }
}
