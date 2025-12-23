import { Events, EmbedBuilder, MessageFlags } from 'discord.js'
import { log } from '../../functions/logger.js'
import { db } from '../../database/client.js'
import { PermissionHandler } from '../../functions/permissions.js'

export default {
    event: Events.InteractionCreate,
    run: async (client, interaction) => {
        // Only handle button interactions
        if (!interaction.isButton()) {
            return null
        }

        const { customId } = interaction

        // Handle ticket-related buttons
        if (customId.startsWith('ticket_')) {
            return handleTicketButton(client, interaction, customId)
        }

        // Handle other button types as needed

        return null
    }
}

/**
 * Handle ticket-related button interactions
 * @param {Object} client - Discord client
 * @param {Object} interaction - Button interaction
 * @param {string} customId - Button custom ID
 */
async function handleTicketButton(client, interaction, customId) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const database = db.getInstance()
        const permHandler = new PermissionHandler(database.prisma)

        // Extract ticket ID from custom ID
        const [action, subAction, ticketId] = customId.split('_')

        if (!ticketId) {
            return interaction.editReply({ content: 'Invalid ticket ID.' })
        }

        // Fetch the ticket
        const ticket = await database.tickets.getTicketDetails(parseInt(ticketId))

        if (!ticket) {
            return interaction.editReply({ content: 'Ticket not found.' })
        }

        // Handle different ticket actions
        switch (subAction) {
            case 'claim':
                // Check if user has permission to claim tickets
                if (!(await permHandler.hasPermission(interaction.user.id, 'PROVIDE_SUPPORT'))) {
                    return interaction.editReply({
                        content: 'You do not have permission to claim tickets.'
                    })
                }

                // Check if user is a support agent
                const agent = await database.agents.getAgentByUserId(BigInt(interaction.user.id))

                if (!agent) {
                    return interaction.editReply({
                        content: 'You need to be registered as a support agent to claim tickets.'
                    })
                }

                // Claim the ticket
                await database.tickets.assignWithDiscord(ticket.id, agent.id, client)

                return interaction.editReply({
                    content: `You have successfully claimed ticket #${ticket.id}.`
                })

            case 'close':
                // Check if user can close this ticket
                const canClose =
                    (await permHandler.hasPermission(interaction.user.id, 'CLOSE_TICKET')) ||
                    (await permHandler.canManageTicket(interaction.user.id, ticket.id)) ||
                    ticket.userId.toString() === interaction.user.id.toString()

                if (!canClose) {
                    return interaction.editReply({
                        content: 'You do not have permission to close this ticket.'
                    })
                }

                // Ask for resolution notes
                const modal = {
                    title: `Close Ticket #${ticket.id}`,
                    custom_id: `ticket_close_modal_${ticket.id}`,
                    components: [
                        {
                            type: 1,
                            components: [
                                {
                                    type: 4,
                                    custom_id: 'resolution',
                                    label: 'Resolution Notes',
                                    style: 2,
                                    placeholder: 'Enter resolution details...',
                                    required: true,
                                    min_length: 5,
                                    max_length: 1000
                                }
                            ]
                        }
                    ]
                }

                return interaction.showModal(modal)

            case 'feedback':
                // Verify user is the ticket creator
                if (ticket.userId.toString() !== interaction.user.id.toString()) {
                    return interaction.editReply({
                        content: 'Only the ticket creator can provide feedback.'
                    })
                }

                const isPositive = customId.includes('positive')

                // Record the feedback
                await database.tickets.recordFeedback(ticket.id, isPositive)

                // If negative feedback, ask for more details
                if (!isPositive) {
                    const modal = {
                        title: 'Ticket Feedback',
                        custom_id: `ticket_feedback_modal_${ticket.id}`,
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 4,
                                        custom_id: 'feedback',
                                        label: 'How could we improve?',
                                        style: 2,
                                        placeholder: 'Please tell us how we could have helped better...',
                                        required: true,
                                        min_length: 5,
                                        max_length: 1000
                                    }
                                ]
                            }
                        ]
                    }

                    return interaction.showModal(modal)
                }

                return interaction.editReply({
                    content: 'Thank you for your feedback!'
                })
        }

        return interaction.editReply({ content: 'Unknown ticket action.' })
    } catch (error) {
        log('Error handling ticket button:', 'error', error)
        return interaction
            .editReply({
                content: 'An error occurred while processing this action.'
            })
            .catch(() => {})
    }
}
