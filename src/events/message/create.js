import { Events } from 'discord.js'

import { db } from '@database/client'
import { MessageHandler } from '@handlers/message.handler'

import { aiService } from '@ai/services/ai.service'
import { ResponseService } from '@ai/services/response.service'
import { TypingService } from '@ai/services/typing.service'
import { promptService } from '@ai/services/prompt.service'

const COMMANDS = {
    help: ['help', 'h'],
    support: ['support', 'sp'],
    legal: ['legal', 'tos', 'privacy'],
    source: ['source', 'sourcecode', 'echosource', 's', 'sc', 'es']
}

export default {
    event: Events.MessageCreate,
    once: false,

    run: async (client, message) => {
        // Skip bot messages
        if (message.author.bot) {
            return null
        }

        // Initialize services
        const messageHandler = new MessageHandler(client, message)
        const responseService = new ResponseService()
        const typingService = new TypingService()

        try {
            // Check if this is a DM channel
            const isDM = !message.guild

            // Check for bot mention or reply
            const isMentioned = message.mentions.has(client.user)
            const isReply = message.reference?.messageId !== undefined
            let isReplyToBot = false
            let referencedMessage = null

            // Process reply if needed
            if (isReply) {
                try {
                    referencedMessage = await message.channel.messages.fetch(message.reference.messageId)
                    isReplyToBot = referencedMessage?.author?.id === client.user.id
                } catch (err) {
                    console.error('Error fetching referenced message:', err)
                }
            }

            // Process the message if:
            // 1. It's a DM channel, or
            // 2. It mentions the bot, or
            // 3. It's a reply to the bot
            if (!isDM && !isMentioned && !isReplyToBot) {
                return null
            }

            // Extract content
            let content = message.content
            if (isMentioned) {
                content = content.replace(new RegExp(`<@!?${client.user.id}>`), '').trim()
            }

            // Check for commands
            const firstWord = content.split(/\s+/)[0]?.toLowerCase()
            const isCommand = Object.values(COMMANDS).some(cmdAliases => cmdAliases.includes(firstWord))

            if (isCommand) {
                return await messageHandler.handleCommand(content, firstWord, COMMANDS)
            }

            // Update user record
            try {
                const database = db.getInstance()
                await database.users.upsertDiscordUser(message.author)
            } catch (error) {
                console.error('Failed to update user record:', error)
            }

            // Start typing immediately for better UX
            const typingController = typingService.startTyping(message.channel)

            try {
                // Create base context data for the message
                const contextData = await promptService.createContext(content, {
                    guild: message.guild,
                    channel: message.channel,
                    author: message.author,
                    isDM,
                    isReply,
                    isReplyToBot,
                    referencedMessage,
                    userInfo: {
                        id: message.author.id,
                        username: message.author.username,
                        displayName: message.author.displayName,
                        avatar: message.author.avatarURL()
                    }
                })

                // Handle reply to bot
                if (isReplyToBot && referencedMessage) {
                    const response = await aiService.generateResponse(content, message.author.id, {
                        ...contextData,
                        isReplyContext: true,
                        originalMessage: referencedMessage.content
                    })

                    // Stop typing
                    typingController.stop()

                    // Send response
                    await responseService.sendResponse(message, response.content)
                    return null
                }

                // Handle regular message
                const response = await aiService.generateResponse(content, message.author.id, contextData)

                // Stop typing
                typingController.stop()

                // Check for response error
                if (response.error) {
                    console.error(`AI Service Error: ${response.error}`)
                    await message
                        .reply({
                            content: `I encountered an error: ${response.error}`
                        })
                        .catch(err => console.error('Failed to send error reply:', err))
                    return null
                }

                // Send the response
                let responseContent = response.content || "I couldn't generate a proper response. Please try again."

                // Format any mentions if needed
                if (response.shouldMention && response.detectedEntities?.length > 0) {
                    const mentionsFormatter = (await import('../../utils/personaManager.js')).formatPeopleMentions
                    const mentions = mentionsFormatter(
                        response.detectedEntities,
                        response.type === 'person_mention_response'
                    )

                    if (mentions) {
                        console.log(`Adding mentions to response: ${mentions}`)
                        responseContent = `${mentions} ${responseContent}`
                    }
                }

                // Send the response
                await responseService.sendResponse(message, responseContent)
            } catch (error) {
                // Stop typing on error
                typingController.stop()

                console.error('Error processing message:', error)
                aiService.performance.recordError('message_processing')

                await message
                    .reply({
                        content: 'I encountered an error while processing your message. Please try again later.'
                    })
                    .catch(() => {})
            }
        } catch (error) {
            console.error('Critical error in message handler:', error)
        }

        return null
    }
}
