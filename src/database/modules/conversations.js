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
}
