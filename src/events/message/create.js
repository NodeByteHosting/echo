import { Events } from 'discord.js'
import { aiService } from '../../services/ai.service.js'
import { db } from '../../database/client.js'
import { detectAndResolvePeople, formatPeopleMentions } from '../../utils/personaManager.js'
import { makeSerializable } from '../../utils/serialization.js'

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
        // Skip irrelevant messages faster with early returns
        if (message.author.bot) {
            return null
        }
        if (!message.guild) {
            return null
        }

        // Check for bot mention or reply more efficiently
        const isMentioned = message.mentions.has(client.user)
        const isReply = message.reference?.messageId !== undefined

        // Only process messages that mention the bot or are replies
        if (!isMentioned && !isReply) {
            return null
        }

        try {
            // Check if this is a reply to the bot specifically
            let isReplyToBot = false
            let referencedMessage = null

            if (isReply) {
                try {
                    // Get the message being replied to
                    referencedMessage = await message.channel.messages.fetch(message.reference.messageId)

                    // Check if the referenced message is from the bot
                    isReplyToBot = referencedMessage?.author?.id === client.user.id
                } catch (err) {
                    console.error('Error fetching referenced message:', err)
                    // Continue processing even if we can't fetch the referenced message
                }
            }

            // We only want to process messages that either mention our bot or reply to it
            if (!isMentioned && !isReplyToBot) {
                return null
            }

            // Extract command and content more efficiently
            const content = message.content.replace(new RegExp(`<@!?${client.user.id}>`), '').trim()

            // Quickly check for commands first
            const firstWord = content.split(/\s+/)[0]?.toLowerCase()
            const isCommand = Object.values(COMMANDS).some(cmdAliases => cmdAliases.includes(firstWord))

            if (isCommand) {
                try {
                    const commandName = Object.entries(COMMANDS).find(([name, aliases]) =>
                        aliases.includes(firstWord)
                    )?.[0]

                    if (commandName && client.msgHandler.send[commandName]) {
                        await client.msgHandler.send[commandName](message)
                        await message.delete().catch(() => {})
                        return null
                    }
                } catch (error) {
                    console.error('Failed to process command:', error)
                }
                return null
            }

            // Before processing the message, update user record using the existing database module
            try {
                // Get database instance
                const database = db.getInstance()

                // Update or create the user record
                await database.users.upsertDiscordUser(message.author)
            } catch (error) {
                console.error('Failed to update user record, but continuing with message processing:', error)
                // Don't block message processing if user record fails
            }

            // If this is a reply to the bot, handle it specially
            if (isReplyToBot && referencedMessage) {
                await processReplyToBot(client, message, referencedMessage)
                return null
            }

            // Handle as AI chat with optimized processing
            try {
                // Start typing immediately to show responsiveness
                const typingController = startTypingIndicator(message.channel)

                // Check if message mentions known individuals
                const peopleDetection = await detectAndResolvePeople(message.content, message.guild)

                // Log detected people for debugging
                if (peopleDetection.detected) {
                    console.log(
                        'Detected people in message:',
                        peopleDetection.mentions.map(p => `${p.name} (found: ${p.foundInGuild})`)
                    )
                }

                // Prepare minimal context data initially
                const baseContextData = {
                    guildName: message.guild.name,
                    channelName: message.channel.name,
                    platform: 'discord',
                    detectedPeople: makeSerializable(peopleDetection.mentions) // Safe serialization for detected people
                }

                // Process the AI response asynchronously with safe serialization
                const responsePromise = aiService.generateResponse(message.content, message.author.id, {
                    ...baseContextData,
                    // Add Discord-specific context for ticket creation but make it safe for serialization
                    message: makeSerializable({
                        id: message.id,
                        content: message.content,
                        author: {
                            id: message.author.id,
                            username: message.author.username,
                            displayName: message.author.displayName
                        }
                    }),
                    client: null, // Don't pass the client directly
                    guildId: message.guild.id,
                    channelId: message.channel.id
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
                    await message
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
                if (
                    peopleDetection.detected &&
                    (response?.shouldMention || response?.type === 'person_mention_response')
                ) {
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
                sendResponse(message, responseContent)
            } catch (error) {
                console.error('AI Processing Error:', error)
                aiService.performance.recordError('message_processing')

                // Simplified error response
                await message
                    .reply({
                        content: 'I encountered an error while processing your message. Please try again later.'
                    })
                    .catch(() => {})
            }
        } catch (error) {
            console.error('Error processing message:', error)
            // Log the error and continue processing other messages
        }
        return null
    }
}

/**
 * Process a reply to one of the bot's messages
 * @param {Client} client - Discord client
 * @param {Message} message - The reply message
 * @param {Message} referencedMessage - The original bot message
 */
async function processReplyToBot(client, message, referencedMessage) {
    try {
        // Get the user from the database or create a new one
        const user = await client.db.users.upsertDiscordUser(message.author)

        // Check if the user is banned
        if (user.isBanned) {
            // If user is banned, ignore the message
            return
        }

        // Extract context from the original message if available
        const context = {
            isReply: true,
            originalMessage: referencedMessage.content
        }

        // Try to extract context data from the original message
        if (referencedMessage.embeds && referencedMessage.embeds.length > 0) {
            // Context might be in the footer or in custom fields
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
        const peopleDetection = await detectAndResolvePeople(message.content, message.guild)

        // Start typing indicator
        const typingController = startTypingIndicator(message.channel)

        try {
            // Process the reply
            const response = await aiService.generateResponse(message.content, message.author.id, {
                ...context,
                message: message,
                client: client,
                guildId: message.guild.id,
                channelId: message.channel.id,
                isReplyContext: true,
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

            sendResponse(message, responseContent)
        } catch (error) {
            typingController.stop()
            console.error('Error processing reply:', error)
            message.reply('I had trouble processing your reply. Please try again.').catch(() => {})
        }
    } catch (error) {
        console.error('Error handling bot reply:', error)
    }
}

/**
 * Executes a promise with a timeout
 * @param {Promise} promise - The promise to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string|Object} fallbackValue - Value to return if timeout occurs
 * @returns {Promise} - The result of the promise or fallback if timeout
 */
const withTimeout = (promise, timeoutMs = 30000, fallbackValue = null) => {
    return new Promise(resolve => {
        const timeoutId = setTimeout(() => {
            if (typeof fallbackValue === 'string') {
                resolve({ content: fallbackValue, error: 'timeout' })
            } else {
                resolve(fallbackValue)
            }
        }, timeoutMs)

        promise
            .then(result => {
                clearTimeout(timeoutId)
                resolve(result)
            })
            .catch(error => {
                clearTimeout(timeoutId)
                console.error('Promise error in withTimeout:', error)
                if (typeof fallbackValue === 'string') {
                    resolve({ content: fallbackValue, error: error.message })
                } else {
                    resolve(fallbackValue)
                }
            })
    })
}

/**
 * Manages typing indicator with automatic refresh
 * @param {Channel} channel - Discord channel
 * @returns {Object} Typing controller
 */
function startTypingIndicator(channel) {
    let active = true

    const typingInterval = setInterval(() => {
        if (active) {
            channel.sendTyping().catch(() => {})
        } else {
            clearInterval(typingInterval)
        }
    }, 5000)

    // Start typing immediately
    channel.sendTyping().catch(() => {})

    return {
        stop: () => {
            active = false
            clearInterval(typingInterval)
        }
    }
}

/**
 * Send response optimized for speed
 * @param {Message} message - Original Discord message
 * @param {string} content - Response content
 */
function sendResponse(message, content) {
    // For very long responses, consider chunking
    if (content.length > 4000) {
        sendLongResponse(message, content)
        return
    }

    // Send normal response
    message.reply({ content }).catch(err => {
        console.error('Failed to send response:', err)
        // Simplified fallback
        message.reply({ content: 'I encountered an issue with sending my response. Please try again.' }).catch(() => {})
    })
}

/**
 * Send a long response in chunks for faster initial display
 * @param {Message} message - Original Discord message
 * @param {string} content - Long response content
 */
async function sendLongResponse(message, content) {
    try {
        // First send a quick initial response
        const firstChunk = content.substring(0, 1800) + '...'
        const initialResponse = await message.reply({ content: firstChunk })

        // Then split the rest into chunks
        const chunks = splitResponseIntoChunks(content, 1900)

        // Send the rest as follow-ups, but skip the first chunk we already sent
        for (let i = 1; i < chunks.length; i++) {
            await message.channel.send({ content: chunks[i] })
        }
    } catch (error) {
        console.error('Error sending long response:', error)
        message
            .reply({ content: 'I created a detailed response but encountered an issue sending it. Please try again.' })
            .catch(() => {})
    }
}

/**
 * Split a response into appropriate chunks
 * @param {string} content - Response content
 * @param {number} maxLength - Maximum chunk length
 * @returns {Array<string>} Array of content chunks
 */
function splitResponseIntoChunks(content, maxLength = 1900) {
    const chunks = []

    // Special handling for code blocks
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
