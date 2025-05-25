import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.GuildScheduledEventDelete,
    once: false,
    run: async (client, event) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: event.guildId }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('EVENT_UPDATES')) {
                return
            }

            const logChannel = await event.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Get deleter from audit logs
            const auditLogs = await event.guild.fetchAuditLogs({
                type: 103, // GUILD_SCHEDULED_EVENT_DELETE
                limit: 1
            })
            const deleter = auditLogs.entries.first()?.executor

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('📅 Scheduled Event Cancelled')
                .setColor(client.colors.error)
                .addFields([
                    { name: 'Event Name', value: event.name, inline: true },
                    { name: 'Cancelled By', value: deleter ? `<@${deleter.id}>` : 'Unknown', inline: true },
                    {
                        name: 'Schedule',
                        value: [
                            `Was scheduled for: <t:${Math.floor(event.scheduledStartTimestamp / 1000)}:F>`,
                            event.scheduledEndTimestamp
                                ? `Would have ended: <t:${Math.floor(event.scheduledEndTimestamp / 1000)}:F>`
                                : 'No end time was set'
                        ].join('\\n'),
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ text: `Event ID: ${event.id}` })

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log(`Error in guildScheduledEventDelete event: ${error.message}`, 'error')
        }
    }
}
