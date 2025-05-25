import { Events } from 'discord.js'
import { aiService } from '../../services/ai.service.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const COMMANDS = {
    help: ['help', 'h'],
    support: ['support', 'sp'],
    legal: ['legal', 'tos', 'privacy']
}

export default {
    event: Events.MessageCreate,
    once: false,

    run: async (client, message) => {
        // Skip if message is from a bot or DM
        if (message.author.bot || !message.guild) {
            return null
        } // Only respond to direct mentions or replies to the bot
        const isReplyToBot =
            message.reference?.messageId &&
            (await message.channel.messages.fetch(message.reference.messageId))?.author.id === client.user.id

        if (!message.mentions.has(client.user) && !isReplyToBot) {
            return null
        }

        // Extract command and args from message (remove bot mention)
        const content = message.content.replace(new RegExp(`<@!?${client.user.id}>`), '').trim()
        const args = content.split(/\s+/).filter(arg => arg.length > 0)
        const req = args[0]?.trim()?.toLowerCase()

        // Use the full message content for processing
        const messageContent = content

        // Handle commands
        const command = Object.entries(COMMANDS).find(([name, aliases]) => aliases.includes(req))?.[0]
        if (command && client.msgHandler.send[command]) {
            try {
                await client.msgHandler.send[command](message)
                await message.delete()
            } catch (error) {
                console.error('Failed to process command:', error)
            }
            return null
        }

        // If no command is provided or command not found, treat as AI chat
        const isCommand = req && Object.values(COMMANDS).some(cmdAliases => cmdAliases.includes(req))
        if (!isCommand) {
            try {
                await message.channel.sendTyping()
                await upsertUser(message)

                // Prepare context data
                const contextData = {
                    guildName: message.guild.name,
                    channelName: message.channel.name,
                    userRoles: message.member.roles.cache.map(r => r.name),
                    isAdmin: message.member.permissions.has('Administrator'),
                    platform: 'discord'
                }

                // If replying to a previous message, add that context
                if (isReplyToBot) {
                    const previousMessage = await message.channel.messages.fetch(message.reference.messageId)
                    contextData.previousMessage = previousMessage.content

                    // Get conversation history
                    const history = await message.channel.messages.fetch({ limit: 5 })
                    contextData.conversationHistory = history
                        .filter(m => m.author.id === client.user.id || m.author.id === message.author.id)
                        .map(m => ({
                            content: m.content,
                            author: m.author.id === client.user.id ? 'assistant' : 'user',
                            timestamp: m.createdTimestamp
                        }))
                }

                // Generate response through AI service
                const response = await aiService.generateResponse(messageContent, message.author.id, contextData)

                // Handle response based on type
                if (response.error) {
                    throw new Error(response.error)
                }

                // Format response content
                const formattedResponse = Array.isArray(response.content) ? response.content : [response.content]

                // Send first message
                const firstMessage = await message.reply({
                    content: formattedResponse[0],
                    allowedMentions: { repliedUser: true }
                })

                // Send any additional messages
                let lastMessage = firstMessage
                for (let i = 1; i < formattedResponse.length; i++) {
                    lastMessage = await lastMessage.reply({
                        content: formattedResponse[i],
                        allowedMentions: { users: [] }
                    })
                } // Add response controls
                const { createResponseControls } = await import('../../components/responseControls.js')
                await lastMessage.edit({
                    components: [createResponseControls()]
                })
            } catch (error) {
                console.error('AI Processing Error:', error)
                aiService.performance.recordError('message_processing', {
                    error: error.message,
                    userId: message.author.id,
                    channelId: message.channel.id
                })

                // Send user-friendly error message
                await message.reply({
                    content: 'I encountered an error while processing your message. Please try again later.',
                    allowedMentions: { repliedUser: true }
                })
            }
            return null
        } // Default to help command if no valid command specified
        try {
            await client.msgHandler.send.help(message)
            await message.delete()
        } catch (error) {
            console.error('Failed to send help message:', error)
        }
        return null
    }
}

// Helper function to handle user registration
async function upsertUser(message) {
    try {
        await prisma.user.upsert({
            where: {
                id: BigInt(message.author.id)
            },
            update: {
                username: message.author.username
            },
            create: {
                id: BigInt(message.author.id),
                username: message.author.username
            }
        })
    } catch (error) {
        console.error('Failed to upsert user:', error)
        // Don't throw the error - we want to continue even if database update fails
    }
}
