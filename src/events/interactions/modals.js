import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'
import { db } from '../../database/client.js'

export default {
    event: Events.InteractionCreate,
    run: async (client, interaction) => {
        // Only handle modal interactions
        if (!interaction.isModalSubmit()) {
            return null
        }

        const { customId } = interaction

        // Handle ticket-related modals
        if (customId.startsWith('ticket_')) {
            return handleTicketModal(client, interaction, customId)
        }

        // Handle other modal types as needed

        return null
    }
}

/**
 * Handle ticket-related modal submissions
 * @param {Object} client - Discord client
 * @param {Object} interaction - Modal interaction
 * @param {string} customId - Modal custom ID
 */
async function handleTicketModal(client, interaction, customId) {
    try {
        await interaction.deferReply({ ephemeral: true })

        const database = db.getInstance()

        // Extract ticket ID from custom ID
        const [action, subAction, type, ticketId] = customId.split('_')

        if (!ticketId) {
            return interaction.editReply({ content: 'Invalid ticket ID.' })
        }

        // Fetch the ticket
        const ticket = await database.tickets.getTicketDetails(parseInt(ticketId))

        if (!ticket) {
            return interaction.editReply({ content: 'Ticket not found.' })
        }

        // Handle different modal types
        switch (subAction + '_' + type) {
            case 'close_modal':
                const resolution = interaction.fields.getTextInputValue('resolution')

                // Close the ticket with the provided resolution
                await database.tickets.closeWithDiscord(ticket.id, resolution, client)

                return interaction.editReply({
                    content: `Ticket #${ticket.id} has been closed.`
                })

            case 'feedback_modal':
                const feedback = interaction.fields.getTextInputValue('feedback')

                // Record detailed feedback
                await database.tickets.recordFeedback(ticket.id, false, feedback)

                return interaction.editReply({
                    content: "Thank you for your detailed feedback! We'll use it to improve our support process."
                })
        }

        return interaction.editReply({ content: 'Unknown modal submission.' })
    } catch (error) {
        log('Error handling ticket modal:', 'error', error)
        return interaction
            .editReply({
                content: 'An error occurred while processing this action.'
            })
            .catch(() => {})
    }
}
