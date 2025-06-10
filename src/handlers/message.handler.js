import { aiService } from '../echo-ai/services/ai.service.js'
import { detectAndResolvePeople, formatPeopleMentions } from '../utils/personaManager.js'
import { makeSerializable } from '../utils/serialization.js'
import { withTimeout } from '../utils/promises.js'

/**
 * Handles different types of messages in the Discord bot
 */
export class MessageHandler {
    /**
     * Create a new message handler
     * @param {Client} client - Discord client
     * @param {Message} message - The message to handle
     */
    constructor(client, message) {
        this.client = client
        this.message = message
        this.author = message.author
        this.channel = message.channel
        this.guild = message.guild
        this.isDM = !message.guild
    }

    /**
     * Handle a command in the message
     * @param {string} content - Message content
     * @param {string} firstWord - First word in the message
     * @param {Object} COMMANDS - Command mappings
     */
    async handleCommand(content, firstWord, COMMANDS) {
        try {
            const commandName = Object.entries(COMMANDS).find(([name, aliases]) => aliases.includes(firstWord))?.[0]

            if (commandName && this.client.msgHandler.send[commandName]) {
                await this.client.msgHandler.send[commandName](this.message)
                await this.message.delete().catch(() => {})
            }
        } catch (error) {
            console.error('Failed to process command:', error)
        }
        return null
    }

    /**
     * Handle a reply to the bot
     * @param {Message} referencedMessage - The message being replied to
     */
    async handleReplyToBot(referencedMessage) {
        try {
            // Get the user from the database or create a new one
            const user = await this.client.db.users.upsertDiscordUser(this.author)

            // Check if the user is banned
            if (user.isBanned) {
                return
            }

            // Extract context from the original message if available
            const context = {
                isReply: true,
                originalMessage: referencedMessage.content
            }

            // Try to extract context data from the original message
            if (referencedMessage.embeds && referencedMessage.embeds.length > 0) {
                const embed = referencedMessage.embeds[0]

                // Check for context type in footer
                if (embed.footer && embed.footer.text) {
                    const contextMatch = embed.footer.text.match(/Context: (\w+)/i)
                    if (contextMatch) {
                        context.type = contextMatch[1].toLowerCase()
                    }
                }

                // Check for special data in fields
                if (embed.fields) {
                    embed.fields.forEach(field => {
                        if (field.name === 'Reference ID' || field.name === 'Ticket ID') {
                            context.referenceId = field.value
                        }
                    })
                }
            }

            // Check if message mentions known individuals
            const peopleDetection = await detectAndResolvePeople(this.message.content, this.guild)

            // Start typing indicator
            const typingController = this.startTypingIndicator()

            try {
                // Process the reply
                const response = await aiService.generateResponse(this.message.content, this.author.id, {
                    ...context,
                    message: this.message,
                    client: this.client,
                    guildId: this.guild?.id,
                    channelId: this.channel.id,
                    isReplyContext: true,
                    isDM: this.isDM,
                    detectedPeople: peopleDetection.mentions // Pass the detected people to the AI
                })

                // Stop typing
                typingController.stop()

                // Send the response
                let responseContent =
                    response?.text ||
                    response?.content ||
                    "I processed your reply, but couldn't generate a proper response. Please try again."

                // If people were detected, add mentions when appropriate
                if (peopleDetection.detected && response?.shouldMention) {
                    const mentions = formatPeopleMentions(peopleDetection.mentions)
                    if (mentions) {
                        responseContent = `${mentions} ${responseContent}`
                    }
                }

                await this.sendResponse(responseContent)
            } catch (error) {
                typingController.stop()
                console.error('Error processing reply:', error)
                this.message.reply('I had trouble processing your reply. Please try again.').catch(() => {})
            }
        } catch (error) {
            console.error('Error handling bot reply:', error)
        }
    }

    /**
     * Handle a message as an AI chat
     * @param {string} content - The message content
     * @param {boolean} isDM - Whether this is a DM channel
     * @param {TypingService} typingService - Typing indicator service
     * @param {ResponseService} responseService - Response handling service
     */
    async handleAIChat(content, isDM, typingService, responseService) {
        try {
            // Start typing immediately to show responsiveness
            const typingController = typingService.startTyping(this.channel)

            // Check if message mentions known individuals
            const peopleDetection = await detectAndResolvePeople(content, this.guild)

            // Log detected people for debugging
            if (peopleDetection.detected) {
                console.log(
                    'Detected people in message:',
                    peopleDetection.mentions.map(p => `${p.name} (found: ${p.foundInGuild})`)
                )
            }

            // Prepare minimal context data initially
            const baseContextData = {
                guildName: this.guild?.name || 'Direct Message',
                channelName: isDM ? 'DM' : this.channel.name,
                platform: 'discord',
                isDM: isDM,
                detectedPeople: makeSerializable(peopleDetection.mentions)
            }

            // Process the AI response asynchronously with safe serialization
            const responsePromise = aiService.generateResponse(content, this.author.id, {
                ...baseContextData,
                // Add Discord-specific context for ticket creation but make it safe for serialization
                message: makeSerializable({
                    id: this.message.id,
                    content: content,
                    author: {
                        id: this.author.id,
                        username: this.author.username,
                        displayName: this.author.displayName
                    }
                }),
                client: null, // Don't pass the client directly
                guildId: this.guild?.id,
                channelId: this.channel.id
            })

            // Wait for the response - keep typing until complete
            const response = await withTimeout(
                responsePromise,
                60000, // 60-second timeout
                'Response generation timed out. Please try again.'
            )

            // Stop typing only after we have the response
            typingController.stop()

            // Handle response errors
            if (response?.error) {
                console.error(`AI Service Error: ${response.content}`)
                await this.message
                    .reply({
                        content: `${response.content || response.error}`
                    })
                    .catch(err => console.error('Failed to send error reply:', err))
                return
            }

            // For long responses, consider sending in chunks for faster initial display
            let responseContent =
                response?.text ||
                response?.content ||
                "I processed your request, but couldn't generate a proper response. Please try again."

            // If people were detected, add mentions when appropriate
            if (peopleDetection.detected && (response?.shouldMention || response?.type === 'person_mention_response')) {
                // Always mention for direct questions about a person
                const mentions = formatPeopleMentions(
                    peopleDetection.mentions,
                    response?.type === 'person_mention_response'
                )

                if (mentions) {
                    console.log(`Adding mentions to response: ${mentions}`)
                    responseContent = `${mentions} ${responseContent}`
                }
            }

            // Send the response immediately
            await responseService.sendResponse(this.message, responseContent)
        } catch (error) {
            console.error('AI Processing Error:', error)
            aiService.performance.recordError('message_processing')

            // Simplified error response
            await this.message
                .reply({
                    content: 'I encountered an error while processing your message. Please try again later.'
                })
                .catch(() => {})
        }
    }

    /**
     * Start a typing indicator
     * @returns {Object} Typing controller
     */
    startTypingIndicator() {
        let active = true

        const typingInterval = setInterval(() => {
            if (active) {
                this.channel.sendTyping().catch(() => {})
            } else {
                clearInterval(typingInterval)
            }
        }, 5000)

        // Start typing immediately
        this.channel.sendTyping().catch(() => {})

        return {
            stop: () => {
                active = false
                clearInterval(typingInterval)
            }
        }
    }

    /**
     * Send a response to the message
     * @param {string} content - Response content
     */
    async sendResponse(content) {
        try {
            if (content.length > 4000) {
                await this.sendLongResponse(content)
            } else {
                await this.message.reply({ content })
            }
        } catch (err) {
            console.error('Failed to send response:', err)
            this.message
                .reply({ content: 'I encountered an issue with sending my response. Please try again.' })
                .catch(() => {})
        }
    }

    /**
     * Send a long response in chunks
     * @param {string} content - Long response content
     */
    async sendLongResponse(content) {
        try {
            // First send a quick initial response
            const firstChunk = content.substring(0, 1800) + '...'
            await this.message.reply({ content: firstChunk })

            // Then split the rest into chunks
            const chunks = this.splitResponseIntoChunks(content, 1900)

            // Send the rest as follow-ups, but skip the first chunk we already sent
            for (let i = 1; i < chunks.length; i++) {
                await this.channel.send({ content: chunks[i] })
            }
        } catch (error) {
            console.error('Error sending long response:', error)
            this.message
                .reply({
                    content: 'I created a detailed response but encountered an issue sending it. Please try again.'
                })
                .catch(() => {})
        }
    }

    /**
     * Split a response into appropriate chunks
     * @param {string} content - Response content
     * @param {number} maxLength - Maximum chunk length
     * @returns {Array<string>} Array of content chunks
     */
    splitResponseIntoChunks(content, maxLength = 1900) {
        // Implementation moved from original file
        const chunks = []
        const parts = content.split(/(```[\s\S]*?```)/)
        let currentChunk = ''

        for (const part of parts) {
            // If this is a code block
            if (part.startsWith('```') && part.endsWith('```')) {
                if (currentChunk.length + part.length > maxLength) {
                    // Code block doesn't fit in current chunk
                    if (currentChunk) {
                        chunks.push(currentChunk)
                    }

                    // If code block is larger than max length, split it
                    if (part.length > maxLength) {
                        const language = part.match(/```(\w+)?/)?.[1] || ''
                        const code = part.replace(/```(\w+)?\n?/, '').replace(/```$/, '')

                        // Split code by lines
                        const lines = code.split('\n')
                        let codeChunk = '```' + language + '\n'

                        for (const line of lines) {
                            if (codeChunk.length + line.length + 4 > maxLength) {
                                chunks.push(codeChunk + '```')
                                codeChunk = '```' + language + '\n' + line + '\n'
                            } else {
                                codeChunk += line + '\n'
                            }
                        }

                        if (codeChunk !== '```' + language + '\n') {
                            chunks.push(codeChunk + '```')
                        }
                    } else {
                        chunks.push(part)
                    }

                    currentChunk = ''
                } else {
                    currentChunk += part
                }
            }
            // For regular text
            else {
                const sentences = part.split(/(?<=\.|\?|\!)\s+/)

                for (const sentence of sentences) {
                    if (currentChunk.length + sentence.length > maxLength) {
                        chunks.push(currentChunk)
                        currentChunk = sentence
                    } else {
                        currentChunk += (currentChunk && !currentChunk.endsWith(' ') ? ' ' : '') + sentence
                    }
                }
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk)
        }

        return chunks
    }
}
