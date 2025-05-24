import { PrismaClient } from '@prisma/client'

export class MessageHistoryTool {
    constructor() {
        this.prisma = new PrismaClient()
    }
    async saveMessage(userId, messageContent, isAiResponse = false) {
        if (!userId) {
            console.error('No userId provided to saveMessage')
            return
        }

        try {
            // Convert userId to BigInt since Discord IDs are strings
            const userIdBigInt = BigInt(userId)

            // Add a new message to history in the database, creating user if needed
            await this.prisma.conversationHistory.create({
                data: {
                    content: messageContent,
                    isAiResponse: isAiResponse,
                    timestamp: new Date(),
                    user: {
                        connectOrCreate: {
                            where: { id: userIdBigInt },
                            create: {
                                id: userIdBigInt,
                                username: `user_${userId}` // Temporary username, can be updated later
                            }
                        }
                    }
                }
            })
        } catch (error) {
            console.error('Failed to save message history:', error)
            throw error // Propagate error to handle it in the AI service
        }
    }
    async getRecentHistory(userId, limit = 10) {
        if (!userId) {
            console.error('No userId provided to getRecentHistory')
            return []
        }

        try {
            // Convert userId to BigInt
            const userIdBigInt = BigInt(userId)

            const history = await this.prisma.conversationHistory.findMany({
                where: {
                    userId: userIdBigInt
                },
                orderBy: {
                    timestamp: 'asc' // Changed to asc to maintain conversation flow
                },
                take: limit
            })

            // Convert to format expected by AI service
            return history.map(msg => ({
                role: msg.isAiResponse ? 'assistant' : 'user',
                content: msg.content
            }))
        } catch (error) {
            console.error('Failed to get message history:', error)
            return []
        }
    }
    async clearHistory(userId) {
        if (!userId) {
            console.error('No userId provided to clearHistory')
            return
        }

        try {
            // Convert userId to BigInt
            const userIdBigInt = BigInt(userId)

            await this.prisma.conversationHistory.deleteMany({
                where: {
                    userId: userIdBigInt
                }
            })
        } catch (error) {
            console.error('Failed to clear message history:', error)
            throw error // Propagate error to handle it in the AI service
        }
    }
}
