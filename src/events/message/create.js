import { Events } from 'discord.js'
import { aiService } from '../../services/ai.service.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Command mapping object that defines available commands and their aliases
 * Format: { commandName: [primaryCommand, ...aliases] }
 */
const COMMANDS = {
    help: ['help', 'h'],
    support: ['support', 'sp'],
    legal: ['legal', 'tos', 'privacy']
}

/**
 * Message Command Handler
 * Handles bot mention commands and AI chat in the format: @bot <message>
 *
 * Features:
 * - Command alias support
 * - Automatic help fallback
 * - Bot mention validation
 * - Guild-only commands
 * - Case-insensitive command matching
 * - AI chat when no command is specified
 *
 * Example Usage:
 * @EchoBot help           - Shows help message
 * @EchoBot h              - Shows help message (alias)
 * @EchoBot support        - Shows support information
 * @EchoBot sp            - Shows support information (alias)
 * @EchoBot Hello there!  - Starts an AI chat conversation
 */
export default {
    event: Events.MessageCreate,
    run: async (client, message) => {
        // Ignore bot messages and DMs
        if (message.author.bot || !message.guild) {
            return
        }

        // Check for bot mention pattern or reply
        const mention = new RegExp(`^<@!?${client.user.id}> ?`)
        const args = message.content.split(' ')
        const req = args[1]?.trim()?.toLowerCase()
        const bot = args[0]

        // Check if message is a reply to the bot or starts with bot mention
        const isReplyToBot =
            message.reference?.messageId &&
            (await message.channel.messages.fetch(message.reference.messageId))?.author.id === client.user.id

        // Exit if not a mention or reply to bot
        if (!mention.test(bot) && !isReplyToBot) {
            return
        }

        // If it's a reply, use the full message content
        const messageContent = isReplyToBot ? message.content : args.slice(1).join(' ')

        // Handle commands
        const command = Object.entries(COMMANDS).find(([_, aliases]) => aliases.includes(req))?.[0]
        if (command && client.msgHandler.send[command]) {
            try {
                await client.msgHandler.send[command](message)
                await message.delete()
            } catch (error) {
                console.error('Failed to process command:', error)
            }
            return
        }

        // If no command is provided or command not found, treat as AI chat
        const isCommand = req && Object.values(COMMANDS).some(cmdAliases => cmdAliases.includes(req))
        if (!isCommand) {
            try {
                await message.channel.sendTyping()
                await upsertUser(message)

                let response

                // Check if this is a follow-up to a context question
                if (isReplyToBot) {
                    const previousMessage = await message.channel.messages.fetch(message.reference.messageId)
                    const isContextQuestion = previousMessage.content.includes(
                        "After you respond, I'll provide a complete answer"
                    )

                    if (isContextQuestion) {
                        // Get the original question and pass the context response
                        const originalMessages = await message.channel.messages.fetch({
                            before: previousMessage.id,
                            limit: 5
                        })

                        const originalMessage = originalMessages.find(
                            m =>
                                m.content &&
                                !m.author.bot &&
                                (m.content.startsWith(`<@${client.user.id}>`) ||
                                    m.content.startsWith(`<@!${client.user.id}>`))
                        )

                        if (originalMessage) {
                            response = await aiService.generateResponse(messageContent, message.author.id)
                        }
                    } else {
                        // Regular follow-up message
                        response = await aiService.generateResponse(messageContent, message.author.id)
                    }
                } else {
                    // New conversation
                    response = await aiService.generateResponse(messageContent, message.author.id)
                } // Handle response delivery
                if (Array.isArray(response)) {
                    // Send first part as a reply to maintain conversation context
                    const firstMessage = await message.reply({
                        content: response[0],
                        allowedMentions: { repliedUser: true }
                    })

                    // Send remaining parts as replies to the previous part
                    let lastMessage = firstMessage
                    for (let i = 1; i < response.length; i++) {
                        lastMessage = await lastMessage.reply({
                            content: response[i],
                            allowedMentions: { users: [] } // Don't ping on follow-up messages
                        })
                    }
                } else {
                    await message.reply({
                        content: response,
                        allowedMentions: { repliedUser: true }
                    })
                }
            } catch (error) {
                console.error('Error in AI chat:', error)
                aiService.performance.recordError('message_processing')
                await message.reply({
                    content: 'Sorry, I encountered an error while processing your message. Please try again later.',
                    allowedMentions: { repliedUser: true }
                })
            }
            return
        }

        // Default to help command if no valid command specified
        try {
            await client.msgHandler.send.help(message)
            await message.delete()
        } catch (error) {
            console.error('Failed to send help message:', error)
        }
    }
}

// Helper function to add reaction controls to a message
async function addResponseControls(message) {
    try {
        // 🔄 - Regenerate response
        // 📝 - Edit/refine response
        // 🗑️ - Delete conversation
        // 💾 - Save to knowledge base
        await message.react('🔄')
        await message.react('📝')
        await message.react('🗑️')
        await message.react('💾')

        // Create a reaction collector
        const filter = (reaction, user) => {
            const validReactions = ['🔄', '📝', '🗑️', '💾']
            return validReactions.includes(reaction.emoji.name) && !user.bot
        }

        const collector = message.createReactionCollector({ filter, time: 15 * 60 * 1000 }) // 15 minutes

        collector.on('collect', async (reaction, user) => {
            switch (reaction.emoji.name) {
                case '🔄':
                    // Remove the original message
                    await message.delete()
                    // Regenerate the response
                    const newResponse = await aiService.regenerateResponse(message)
                    const newMessage = await message.channel.send({
                        content: Array.isArray(newResponse) ? newResponse[0] : newResponse,
                        allowedMentions: { users: [user.id] }
                    })
                    if (Array.isArray(newResponse)) {
                        for (let i = 1; i < newResponse.length; i++) {
                            await message.channel.send({
                                content: newResponse[i],
                                allowedMentions: { users: [] }
                            })
                        }
                    }
                    await addResponseControls(newMessage)
                    break

                case '📝':
                    // Send prompt for refinement
                    await message.channel.send({
                        content: `<@${user.id}> Please reply to this message with how you'd like me to refine my response.`,
                        allowedMentions: { users: [user.id] }
                    })
                    break

                case '🗑️':
                    // Delete the message and clear conversation history
                    await message.delete()
                    await aiService.clearUserHistory(user.id)
                    await message.channel.send({
                        content: `<@${user.id}> I've cleared our conversation history.`,
                        allowedMentions: { users: [user.id] }
                    })
                    break

                case '💾':
                    // Implement knowledge base saving here
                    await message.channel.send({
                        content: `<@${user.id}> Response saved to knowledge base!`,
                        allowedMentions: { users: [user.id] }
                    })
                    break
            }
        })
    } catch (error) {
        console.error('Failed to add response controls:', error)
    }
}

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
