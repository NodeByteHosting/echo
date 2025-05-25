import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.GuildScheduledEventUpdate,
    once: false,
    run: async (client, oldEvent, newEvent) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: newEvent.guildId }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('EVENT_UPDATES')) {
                return
            }

            const logChannel = await newEvent.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Track changes
            const changes = []

            if (oldEvent.name !== newEvent.name) {
                changes.push(`Name: "${oldEvent.name}" → "${newEvent.name}"`)
            }

            if (oldEvent.description !== newEvent.description) {
                changes.push('Description was updated')
            }

            if (oldEvent.scheduledStartTimestamp !== newEvent.scheduledStartTimestamp) {
                changes.push(
                    `Start Time: <t:${Math.floor(oldEvent.scheduledStartTimestamp / 1000)}:F> → ` +
                        `<t:${Math.floor(newEvent.scheduledStartTimestamp / 1000)}:F>`
                )
            }

            if (oldEvent.scheduledEndTimestamp !== newEvent.scheduledEndTimestamp) {
                const oldEnd = oldEvent.scheduledEndTimestamp
                    ? `<t:${Math.floor(oldEvent.scheduledEndTimestamp / 1000)}:F>`
                    : 'None'
                const newEnd = newEvent.scheduledEndTimestamp
                    ? `<t:${Math.floor(newEvent.scheduledEndTimestamp / 1000)}:F>`
                    : 'None'
                changes.push(`End Time: ${oldEnd} → ${newEnd}`)
            }

            if (oldEvent.status !== newEvent.status) {
                changes.push(`Status: ${oldEvent.status} → ${newEvent.status}`)
            }

            if (oldEvent.channel?.id !== newEvent.channel?.id) {
                const oldChannel = oldEvent.channel ? `<#${oldEvent.channel.id}>` : 'None'
                const newChannel = newEvent.channel ? `<#${newEvent.channel.id}>` : 'None'
                changes.push(`Channel: ${oldChannel} → ${newChannel}`)
            }

            if (changes.length > 0) {
                // Get updater from audit logs
                const auditLogs = await newEvent.guild.fetchAuditLogs({
                    type: 102, // GUILD_SCHEDULED_EVENT_UPDATE
                    limit: 1
                })
                const updater = auditLogs.entries.first()?.executor

                const embed = new client.Gateway.EmbedBuilder()
                    .setTitle('📅 Scheduled Event Updated')
                    .setColor(client.colors.warning)
                    .addFields([
                        { name: 'Event Name', value: newEvent.name, inline: true },
                        { name: 'Updated By', value: updater ? `<@${updater.id}>` : 'Unknown', inline: true },
                        { name: 'Status', value: newEvent.status, inline: true },
                        {
                            name: 'Changes',
                            value: changes.join('\\n'),
                            inline: false
                        }
                    ])
                    .setTimestamp()
                    .setFooter({ text: `Event ID: ${newEvent.id}` })

                if (newEvent.image) {
                    embed.setImage(newEvent.coverImageURL())
                }

                await logChannel.send({ embeds: [embed] })
            }
        } catch (error) {
            log(`Error in guildScheduledEventUpdate event: ${error.message}`, 'error')
        }
    }
}
