import { BaseAgent } from './baseAgent.js'
import { db } from '../../database/client.js'
import { EmbedBuilder } from 'discord.js'
import { aiConfig } from '../../configs/ai.config.js'
import { makeSerializable } from '../../utils/serialization.js'

export class ConversationAgent extends BaseAgent {
    constructor(aiModel) {
        super()
        this.aiModel = aiModel
        this.database = db.getInstance()

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

        // Use the conversation module to get history
        const history = await this.database.conversations.getHistory(userId, 10)

        // Make history serializable by converting BigInts to strings
        const serializableHistory = makeSerializable(history)

        // Get AI to determine conversation intent and style
        const analysis = await this.aiModel.getResponse(`Analyze this message in the context of the conversation:
Message: "${message}"
History: ${JSON.stringify(serializableHistory)}

Determine:
1. Conversation style (formal, casual, technical)
2. User's intent
3. Required response format
4. Whether previous context is relevant

Return JSON only in this format: {"style":"value","intent":"value","format":"value","useContext":true/false}`)

        // Safely parse the JSON with error handling
        let messageContext
        try {
            messageContext = this._extractJsonFromText(analysis)
        } catch (error) {
            console.error('Failed to parse analysis JSON:', error)
            // Use default values as fallback
            messageContext = {
                style: 'casual',
                intent: 'general',
                format: 'text',
                useContext: true
            }
        }

        // Build conversation-aware prompt
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
            // Use the conversation module
            const history = await this.database.conversations.getHistory(userId, limit)

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
            await this.database.conversations.addEntry(userId, messageContent, isAiResponse)
        } catch (error) {
            console.error('Failed to save message:', error)
        }
    }

    async clearHistory(userId) {
        if (!userId) {
            return
        }

        try {
            await this.database.conversations.clearHistory(userId)
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
            await this.database.conversations.addEntry(userId, content, isAiResponse)
        } catch (error) {
            console.error('Failed to save message:', error)
        }
    }

    _formatForDiscord(content) {
        // Simple messages just return as is
        if (content.length < 2000 && !content.includes('```') && !content.includes('**')) {
            return { content }
        }

        // For complex messages with code blocks or formatting, use more detailed handling
        if (content.length > 2000) {
            // Long message - inform caller this is a long response
            return {
                content: content.substring(0, 1900) + '...',
                longResponse: true,
                fullContent: content
            }
        }

        // For shorter messages with formatting, use an embed
        const embed = new EmbedBuilder().setDescription(content).setColor('#0099ff')
        return { embeds: [embed] }
    }

    async streamResponse(message, userId, contextData) {
        const initialResponse = "I'm thinking about this..."

        // Send initial response immediately
        const sentMessage = await this._sendInitialResponse(message, initialResponse)

        // Process the full response in the background
        const fullResponse = await this.process(message, userId, contextData)

        // Update the message with the full response
        await this._updateResponse(sentMessage, fullResponse.content)

        // Save the messages
        await Promise.all([
            this._saveMessage(userId, message, false),
            this._saveMessage(userId, fullResponse.content, true)
        ])

        return fullResponse
    }

    async _sendInitialResponse(message, content) {
        // Implementation depends on your Discord setup
        // This is a placeholder for the actual implementation
        return { content, id: 'temp-id' }
    }

    async _updateResponse(sentMessage, newContent) {
        // Implementation depends on your Discord setup
        // This is a placeholder for the actual implementation
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
            // This functionality should be moved to a database management service
            // or scheduled task rather than being handled by the agent
            console.log('Message cleanup completed:', new Date())
        } catch (error) {
            console.error('Error during message cleanup:', error)
        }
    }

    /**
     * Extracts valid JSON from text that might contain non-JSON content
     * @param {string} text - Text that might contain JSON
     * @returns {Object} Parsed JSON object
     */
    _extractJsonFromText(text) {
        // Try to find JSON between markdown code blocks
        const jsonBlockMatch = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/)
        if (jsonBlockMatch && jsonBlockMatch[1]) {
            try {
                return JSON.parse(jsonBlockMatch[1].trim())
            } catch (e) {
                console.warn('Failed to parse JSON from code block', e)
                // Continue to other methods
            }
        }

        // Try to find JSON with curly braces
        const jsonMatch = text.match(/{[\s\S]*?}/)
        if (jsonMatch && jsonMatch[0]) {
            try {
                return JSON.parse(jsonMatch[0])
            } catch (e) {
                console.warn('Failed to parse JSON with regex', e)
                // Continue to last method
            }
        }

        // Last resort: try parsing the whole text
        try {
            return JSON.parse(text)
        } catch (e) {
            // If all parsing methods fail, create a simple object from text analysis
            console.warn('All JSON parsing methods failed', e)

            // Create a basic object from the text
            const fallbackObj = {
                style: text.includes('formal') ? 'formal' : text.includes('technical') ? 'technical' : 'casual',
                intent: text.includes('help') ? 'help' : text.includes('information') ? 'information' : 'general',
                format: text.includes('code') ? 'code' : 'text',
                useContext: !text.includes('context: false')
            }

            return fallbackObj
        }
    }
}
