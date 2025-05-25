import { BaseAgent } from './baseAgent.js'
import { PrismaClient } from '@prisma/client'
import { EmbedBuilder } from 'discord.js'
import { aiConfig } from '../../configs/ai.config.js'

export class ConversationAgent extends BaseAgent {
    constructor(aiModel) {
        super()
        this.aiModel = aiModel
        this.prisma = new PrismaClient()

        // Rate limiting configuration
        this.rateLimits = {
            messages: {
                window: 60000, // 1 minute window
                maxRequests: 10, // 10 messages per minute
                burstWindow: 5000, // 5 second burst window
                burstLimit: 3 // 3 messages in burst window
            }
        }

        // Message cleanup configuration
        this.cleanupConfig = {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
            maxMessagesPerUser: 100, // Keep last 100 messages per user
            cleanupInterval: 24 * 60 * 60 * 1000, // Run cleanup daily
            batchSize: 100 // Process 100 messages per batch
        }

        // Initialize rate limiting cache
        this.messageTimestamps = new Map() // Start cleanup scheduler
        this._startCleanupScheduler()
    }

    async canHandle(message) {
        // Conversation agent handles all messages, but lets other specialized agents go first
        return true
    }

    async process(message, userId, contextData) {
        // Check rate limit before processing
        await this._checkRateLimit(userId)
        const history = await this.prisma.conversationHistory.findMany({
            where: {
                userId: BigInt(userId),
                timestamp: {
                    gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
                }
            },
            orderBy: { timestamp: 'asc' },
            take: 10,
            select: {
                content: true,
                isAiResponse: true,
                timestamp: true
            }
        })

        // Get AI to determine conversation intent and style
        const analysis = await this.aiModel.getResponse(`Analyze this message in the context of the conversation:
Message: "${message}"
History: ${JSON.stringify(history)}

Determine:
1. Conversation style (formal, casual, technical)
2. User's intent
3. Required response format
4. Whether previous context is relevant

Return: JSON with style, intent, format, and useContext properties`)

        const messageContext = JSON.parse(analysis) // Build conversation-aware prompt
        const enhancedPrompt = await this._buildConversationPrompt(message, history, messageContext, contextData)
        const response = await this.aiModel.getResponse(enhancedPrompt)

        // Save messages to history
        await Promise.all([this._saveMessage(userId, message, false), this._saveMessage(userId, response, true)])

        // Format for Discord
        return this._formatForDiscord(response)
    }

    async getHistory(userId, limit = 10) {
        if (!userId) {
            return []
        }

        try {
            const userIdBigInt = BigInt(userId)

            const history = await this.prisma.conversationHistory.findMany({
                where: { userId: userIdBigInt },
                orderBy: { timestamp: 'asc' },
                take: limit
            })

            return history.map(msg => ({
                role: msg.isAiResponse ? 'assistant' : 'user',
                content: msg.content
            }))
        } catch (error) {
            console.error('Failed to get message history:', error)
            return []
        }
    }

    async saveMessage(userId, messageContent, isAiResponse = false) {
        if (!userId) {
            return
        }

        try {
            const userIdBigInt = BigInt(userId)

            await this.prisma.conversationHistory.create({
                data: {
                    content: messageContent,
                    isAiResponse,
                    timestamp: new Date(),
                    user: {
                        connectOrCreate: {
                            where: { id: userIdBigInt },
                            create: { id: userIdBigInt }
                        }
                    }
                }
            })
        } catch (error) {
            console.error('Failed to save message:', error)
        }
    }

    async clearHistory(userId) {
        if (!userId) {
            return
        }

        try {
            const userIdBigInt = BigInt(userId)
            await this.prisma.conversationHistory.deleteMany({
                where: { userId: userIdBigInt }
            })
        } catch (error) {
            console.error('Failed to clear history:', error)
        }
    }

    formatResponse(response) {
        // If response is within Discord's limit, return as is
        if (response.length <= 1900) {
            return response
        }

        return this.smartSplit(response)
    }
    async _buildConversationPrompt(message, history, messageContext, contextData) {
        let prompt = aiConfig.systemPrompt

        if (messageContext.useContext && contextData) {
            prompt += '\n\nContext:\n' + JSON.stringify(contextData)
        }

        if (messageContext.useContext && history.length > 0) {
            prompt +=
                '\n\nConversation History:\n' +
                history
                    .slice(-3) // Last 3 messages for context
                    .map(h => `${h.role}: ${h.content}`)
                    .join('\n')
        }

        prompt += `\n\nStyle Guide:
- Conversation Style: ${messageContext.style}
- User Intent: ${messageContext.intent}
- Response Format: ${messageContext.format}`

        return prompt
    }

    _smartSplit(response) {
        const parts = []
        const maxLength = 1900 // Leave room for part numbers

        // Split by code blocks to preserve them
        const blocks = response.split(/(```[\s\S]*?```)/)
        let currentPart = ''

        for (const block of blocks) {
            if (block.startsWith('```')) {
                if (currentPart.length + block.length > maxLength) {
                    if (currentPart.trim()) {
                        parts.push(currentPart.trim())
                    }
                    parts.push(block)
                    currentPart = ''
                } else {
                    currentPart += (currentPart ? '\n' : '') + block
                }
                continue
            }

            // Split regular text by paragraphs
            const paragraphs = block.split(/\n\s*\n/)

            for (const paragraph of paragraphs) {
                if (currentPart.length + paragraph.length + 2 <= maxLength) {
                    currentPart += (currentPart ? '\n\n' : '') + paragraph
                } else {
                    if (currentPart.trim()) {
                        parts.push(currentPart.trim())
                    }
                    currentPart = paragraph
                }
            }
        }

        if (currentPart.trim()) {
            parts.push(currentPart.trim())
        }

        // Add part numbers if there are multiple parts
        if (parts.length > 1) {
            return parts.map((part, i) => `[Part ${i + 1}/${parts.length}]\n${part}`)
        }

        return parts
    }

    async _saveMessage(userId, content, isAiResponse) {
        try {
            const userIdBigInt = BigInt(userId)

            await this.prisma.conversationHistory.create({
                data: {
                    content,
                    isAiResponse,
                    timestamp: new Date(),
                    user: {
                        connectOrCreate: {
                            where: { id: userIdBigInt },
                            create: {
                                id: userIdBigInt,
                                username: `user_${userId}`
                            }
                        }
                    }
                }
            })
        } catch (error) {
            console.error('Failed to save message:', error)
        }
    }

    _formatForDiscord(content) {
        // Simple messages just return as is
        if (content.length < 2000 && !content.includes('```') && !content.includes('**')) {
            return { content }
        }

        // For complex messages, use an embed
        const embed = new EmbedBuilder().setDescription(content).setColor('#0099ff')

        return { embeds: [embed] }
    }

    async _checkRateLimit(userId) {
        const now = Date.now()
        const key = `${userId}`

        if (!this.messageTimestamps.has(key)) {
            this.messageTimestamps.set(key, [])
        }

        const timestamps = this.messageTimestamps.get(key)

        // Clean up old timestamps
        const validTimestamps = timestamps.filter(time => now - time < this.rateLimits.messages.window)
        this.messageTimestamps.set(key, validTimestamps)

        // Check burst limit
        const burstTimestamps = validTimestamps.filter(time => now - time < this.rateLimits.messages.burstWindow)
        if (burstTimestamps.length >= this.rateLimits.messages.burstLimit) {
            const waitTime = Math.ceil(
                (this.rateLimits.messages.burstWindow - (now - Math.min(...burstTimestamps))) / 1000
            )
            throw new Error(`You're sending messages too quickly. Please wait ${waitTime} seconds.`)
        }

        // Check overall rate limit
        if (validTimestamps.length >= this.rateLimits.messages.maxRequests) {
            const waitTime = Math.ceil((this.rateLimits.messages.window - (now - Math.min(...validTimestamps))) / 1000)
            throw new Error(`Message rate limit exceeded. Please wait ${waitTime} seconds.`)
        }

        // Add new timestamp
        validTimestamps.push(now)
        return true
    }

    async _startCleanupScheduler() {
        // Initial cleanup
        await this._cleanupOldMessages()

        // Schedule regular cleanup
        setInterval(async () => {
            await this._cleanupOldMessages()
        }, this.cleanupConfig.cleanupInterval)
    }

    async _cleanupOldMessages() {
        try {
            const cutoffDate = new Date(Date.now() - this.cleanupConfig.maxAge)

            // Get all users with conversation history
            const users = await this.prisma.user.findMany({
                where: {
                    conversations: {
                        some: {}
                    }
                },
                select: { id: true }
            })

            // Process each user's history
            for (const user of users) {
                // Delete old messages
                await this.prisma.conversationHistory.deleteMany({
                    where: {
                        userId: user.id,
                        timestamp: {
                            lt: cutoffDate
                        }
                    }
                })

                // Get total message count for user
                const messageCount = await this.prisma.conversationHistory.count({
                    where: { userId: user.id }
                })

                // If user has more than max messages, delete oldest ones
                if (messageCount > this.cleanupConfig.maxMessagesPerUser) {
                    const messagesToDelete = messageCount - this.cleanupConfig.maxMessagesPerUser
                    const oldestMessages = await this.prisma.conversationHistory.findMany({
                        where: { userId: user.id },
                        orderBy: { timestamp: 'asc' },
                        take: messagesToDelete,
                        select: { id: true }
                    })

                    await this.prisma.conversationHistory.deleteMany({
                        where: {
                            id: {
                                in: oldestMessages.map(m => m.id)
                            }
                        }
                    })
                }
            }

            console.log('Message cleanup completed:', new Date())
        } catch (error) {
            console.error('Error during message cleanup:', error)
        }
    }
}
