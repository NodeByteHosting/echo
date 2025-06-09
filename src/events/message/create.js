import { Events } from 'discord.js'
import { aiService } from '../../services/ai.service.js'
import { db } from '../../database/client.js'
import { detectAndResolvePeople, formatPeopleMentions } from '../../utils/personaManager.js'
import { makeSerializable } from '../../utils/serialization.js'
import { MessageHandler } from '../../handlers/message.handler.js'
import { ResponseService } from '../../services/response.service.js'
import { TypingService } from '../../services/typing.service.js'

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

        // Initialize handlers and services
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
                console.error('Failed to update user record, but continuing with message processing:', error)
            }

            // Handle reply to bot
            if (isReplyToBot && referencedMessage) {
                return await messageHandler.handleReplyToBot(referencedMessage)
            }

            // Handle as AI chat
            await messageHandler.handleAIChat(content, isDM, typingService, responseService)
        } catch (error) {
            console.error('Error processing message:', error)
        }
        return null
    }
}
