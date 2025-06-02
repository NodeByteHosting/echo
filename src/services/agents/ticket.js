import { BaseAgent } from './baseAgent.js'
import { TicketStatus } from '@prisma/client'
import { log } from '../../functions/logger.js'
import { db } from '../../database/client.js'
import {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} from 'discord.js'

export class TicketAgent extends BaseAgent {
    constructor(aiModel) {
        super()
        this.aiModel = aiModel
        this.database = db.getInstance()

        // Ticket-specific indicators
        this.ticketIndicators = [
            'ticket',
            'create ticket',
            'open ticket',
            'support ticket',
            'help desk',
            'support request',
            'assistance request',
            'need help with',
            'staff help',
            'human support',
            'escalate',
            'urgent',
            'critical issue'
        ]
    }

    async canHandle(message) {
        const msg = message.toLowerCase()

        // Direct ticket mentions
        const hasDirectMention = this.ticketIndicators.some(term => msg.includes(term))
        if (hasDirectMention) {
            return true
        }

        // Use AI to determine if this is a ticket request for more nuanced cases
        const response = await this.aiModel
            .getResponse(`Determine if this message is explicitly requesting to create a support ticket or talk to staff:
Message: "${message}"

Consider:
1. Is the user explicitly asking for a ticket to be created?
2. Are they asking to talk to a staff member or human?
3. Are they requesting formal support for a critical issue?
4. Is this an urgent request that needs staff attention?

Return ONLY: "ticket" if they're requesting a ticket or staff help, or "no-ticket" otherwise.`)

        return response.toLowerCase().includes('ticket')
    }

    async process(message, userId, contextData) {
        try {
            // Check if we have the necessary Discord context
            if (!contextData.message || !contextData.client) {
                log('Missing Discord context for ticket creation', 'error')
                return {
                    content:
                        "I'm sorry, I couldn't create a ticket due to missing context. Please try again or contact staff directly.",
                    error: true
                }
            }

            const discordMessage = contextData.message
            const client = contextData.client
            const guild = discordMessage.guild

            // Analyze the severity and category of the ticket request
            const analysis = await this.analyzeTicketRequest(message)

            // Create a thread for the ticket
            const thread = await this._createTicketThread(discordMessage, analysis)

            if (!thread) {
                return {
                    content:
                        "I'm sorry, I couldn't create a ticket thread. Please try again or contact staff directly.",
                    error: true
                }
            }

            // Create the ticket in the database
            const ticket = await this._createTicketRecord(message, userId, analysis, thread.id)

            // Send initial thread message with ticket information
            await this._sendTicketWelcomeMessage(thread, ticket, analysis, guild)

            // Notify support staff based on guild configuration
            await this._notifySupportStaff(thread, ticket, analysis, guild)

            // Generate a response that acknowledges the ticket creation
            const response = await this.generateTicketResponse(message, ticket, analysis, thread)

            return {
                content: response,
                type: 'ticket_created',
                metadata: {
                    ticketId: ticket.id,
                    threadId: thread.id,
                    status: ticket.status,
                    priority: ticket.priority,
                    assignedTo: ticket.assignedTo
                }
            }
        } catch (error) {
            log('Error in TicketAgent process:', 'error', error)
            return {
                content:
                    "I'm sorry, I couldn't create a ticket at this time. Please try again or contact staff directly.",
                error: true
            }
        }
    }

    /**
     * Create a private thread for the ticket
     * @param {Object} message - Discord message object
     * @param {Object} analysis - Ticket analysis data
     * @returns {Promise<Object>} The created thread
     * @private
     */
    async _createTicketThread(message, analysis) {
        try {
            // Generate a ticket name based on category and priority
            const priorityIndicator = '🔴'.repeat(Math.min(analysis.priority, 5))
            const threadName = `${priorityIndicator} ${analysis.category.toUpperCase()}: ${analysis.summary.slice(0, 50)}`

            // Create a private thread
            const thread = await message.channel.threads.create({
                name: threadName,
                autoArchiveDuration: 10080, // 7 days
                type: ChannelType.PrivateThread,
                reason: `Ticket: ${analysis.summary}`
            })

            // Add the user to the thread
            await thread.members.add(message.author.id)

            return thread
        } catch (error) {
            log('Error creating ticket thread:', 'error', error)
            return null
        }
    }

    /**
     * Create a ticket record in the database
     * @param {string} message - Original message content
     * @param {string} userId - User ID
     * @param {Object} analysis - Ticket analysis
     * @param {string} threadId - Discord thread ID
     * @returns {Promise<Object>} The created ticket
     * @private
     */
    async _createTicketRecord(message, userId, analysis, threadId) {
        try {
            return await this.database.tickets.create({
                title: analysis.summary || `Support Request: ${message.slice(0, 50)}...`,
                description: message,
                userId: BigInt(userId),
                status: TicketStatus.OPEN,
                priority: analysis.priority,
                category: analysis.category,
                threadId: threadId,
                messages: {
                    create: {
                        content: message,
                        senderId: BigInt(userId),
                        isInternal: false
                    }
                }
            })
        } catch (error) {
            log('Error creating ticket record:', 'error', error)
            throw error
        }
    }

    /**
     * Send welcome message in the ticket thread
     * @param {Object} thread - Discord thread object
     * @param {Object} ticket - Ticket database record
     * @param {Object} analysis - Ticket analysis
     * @param {Object} guild - Discord guild object
     * @private
     */
    async _sendTicketWelcomeMessage(thread, ticket, analysis, guild) {
        try {
            // Get guild configuration
            const guildConfig = await this.database.guild.getConfig(guild.id)

            // Create welcome embed
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`Ticket #${ticket.id} - ${ticket.title}`)
                .setDescription(`Thank you for creating a ticket. Our support team will assist you shortly.`)
                .addFields(
                    { name: 'Priority', value: '⭐'.repeat(analysis.priority), inline: true },
                    { name: 'Category', value: analysis.category, inline: true },
                    { name: 'Status', value: ticket.status, inline: true }
                )
                .addFields({
                    name: 'While you wait',
                    value:
                        'Please provide any additional details that might help us resolve your issue faster:' +
                        '\n- Screenshots or error messages' +
                        '\n- Steps to reproduce the issue' +
                        '\n- When the issue started' +
                        "\n- What you've already tried"
                })
                .setFooter({ text: `Ticket System • ${new Date().toLocaleString()}` })

            // Create action buttons for staff
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket_claim_${ticket.id}`)
                    .setLabel('Claim Ticket')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`ticket_close_${ticket.id}`)
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
            )

            // Send welcome message
            await thread.send({ embeds: [embed], components: [buttons] })

            // Add checklist for the user
            const checklistEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Help us help you faster')
                .setDescription('Please check off these items as you provide them:')
                .addFields(
                    { name: '1. Problem Description', value: '☑️ Already provided in your ticket', inline: false },
                    { name: '2. System Information', value: '⬜ Your OS, browser, device, etc.', inline: false },
                    { name: '3. Error Messages', value: '⬜ Screenshots or error text', inline: false },
                    { name: '4. Reproduction Steps', value: '⬜ How to reproduce the issue', inline: false }
                )

            await thread.send({ embeds: [checklistEmbed] })
        } catch (error) {
            log('Error sending ticket welcome message:', 'error', error)
        }
    }

    /**
     * Notify support staff about the new ticket
     * @param {Object} thread - Discord thread object
     * @param {Object} ticket - Ticket database record
     * @param {Object} analysis - Ticket analysis
     * @param {Object} guild - Discord guild object
     * @private
     */
    async _notifySupportStaff(thread, ticket, analysis, guild) {
        try {
            // Get guild configuration
            const guildConfig = await this.database.guild.getConfig(guild.id)

            let supportRoleId = null
            let mentionString = ''

            // Check if the guild has configured support roles
            if (guildConfig?.supportRoleId) {
                supportRoleId = guildConfig.supportRoleId
                mentionString = `<@&${supportRoleId}>`
            }

            // Check for available support agents in the database
            const availableAgents = await this.database.agents.getAllActiveAgents()
            if (availableAgents.length > 0) {
                // Get up to 2 agents with the lowest active ticket counts
                const sortedAgents = availableAgents
                    .sort((a, b) => (a.tickets?.length || 0) - (b.tickets?.length || 0))
                    .slice(0, 2)

                // Add agent mentions
                if (sortedAgents.length > 0) {
                    const agentMentions = sortedAgents.map(agent => `<@${agent.userId}>`).join(' ')
                    mentionString = mentionString ? `${mentionString} ${agentMentions}` : agentMentions
                }
            }

            // Send notification with priority-based alert levels
            let alertPrefix = ''
            if (analysis.priority >= 4) {
                alertPrefix = '🚨 **HIGH PRIORITY** 🚨\n'
            } else if (analysis.priority >= 3) {
                alertPrefix = '⚠️ **Medium Priority**\n'
            }

            // Add support staff to the thread
            if (supportRoleId) {
                await thread.send(`${alertPrefix}${mentionString}, a new support ticket has been created.`)
            }

            // For high priority tickets, also send notification to the ticket log channel
            if (analysis.priority >= 4 && guildConfig?.ticketLogChannelId) {
                try {
                    const ticketLogChannel = await guild.channels.fetch(guildConfig.ticketLogChannelId)
                    if (ticketLogChannel) {
                        const alertEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('🚨 High Priority Ticket Created')
                            .setDescription(
                                `A priority ${analysis.priority} ticket has been created by <@${ticket.userId}>.`
                            )
                            .addFields(
                                { name: 'Ticket ID', value: `#${ticket.id}`, inline: true },
                                { name: 'Category', value: analysis.category, inline: true },
                                { name: 'Thread', value: `<#${thread.id}>`, inline: true }
                            )
                            .setTimestamp()

                        await ticketLogChannel.send({ embeds: [alertEmbed] })
                    }
                } catch (error) {
                    log('Error sending to ticket log channel:', 'error', error)
                }
            }
        } catch (error) {
            log('Error notifying support staff:', 'error', error)
        }
    }

    /**
     * Generate a response to acknowledge ticket creation
     * @param {string} message - Original user message
     * @param {Object} ticket - The ticket object
     * @param {Object} analysis - Ticket analysis
     * @param {Object} thread - Discord thread object
     * @returns {Promise<string>} The response text
     */
    async generateTicketResponse(message, ticket, analysis, thread) {
        const responsePrompt = `Generate a response for a user who just created a support ticket.
Original request: "${message}"
Ticket summary: ${analysis.summary}
Priority: ${analysis.priority}/5
Category: ${analysis.category}

Write a brief, reassuring response as Echo, acknowledging that:
1. A support ticket (#${ticket.id}) has been created in a private thread
2. Support staff have been notified and will assist them soon
3. They should check the thread for next steps
4. The thread is accessible via this link: <#${thread.id}>

Keep the response under 1000 characters and maintain a helpful, professional tone.`

        try {
            const response = await this.aiModel.getResponse(responsePrompt)

            // Ensure the thread link is included
            if (!response.includes(thread.id)) {
                return `${response}\n\nYou can access your ticket here: <#${thread.id}>`
            }

            return response
        } catch (error) {
            log('Error generating ticket response:', 'error', error)
            return `I've created ticket #${ticket.id} for you in a private thread. Our support team has been notified and will assist you shortly. You can access your ticket here: <#${thread.id}>`
        }
    }

    /**
     * Create a ticket on behalf of another agent
     * @param {string} message - User message
     * @param {string} userId - User ID
     * @param {Object} analysis - Optional pre-analyzed data
     * @returns {Promise<Object>} The created ticket
     */
    async createTicketOnBehalf(message, userId, analysis = null) {
        // Get analysis if not provided
        const ticketAnalysis = analysis || (await this.analyzeTicketRequest(message))

        // Create the ticket
        return this.createOrUpdateTicket(message, userId, ticketAnalysis)
    }

    /**
     * Check if a ticket exists for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Ticket or null
     */
    async checkExistingTicket(userId) {
        return this.database.tickets.findOpenTicketByUserId(BigInt(userId))
    }

    /**
     * Add a message to an existing ticket
     * @param {number} ticketId - Ticket ID
     * @param {string} userId - User ID
     * @param {string} content - Message content
     * @param {boolean} isInternal - Whether the message is internal
     * @returns {Promise<Object>} The created message
     */
    async addMessageToTicket(ticketId, userId, content, isInternal = false) {
        return this.database.tickets.addMessage(ticketId, userId, content, isInternal)
    }
}
