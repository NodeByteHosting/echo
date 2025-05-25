import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.GuildScheduledEventCreate,
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

            const creator = await event.creator.fetch()

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('📅 Scheduled Event Created')
                .setColor(client.colors.success)
                .addFields([
                    { name: 'Event Name', value: event.name, inline: true },
                    { name: 'Created By', value: creator ? `<@${creator.id}>` : 'Unknown', inline: true },
                    { name: 'Type', value: event.type, inline: true },
                    {
                        name: 'Schedule',
                        value: [
                            `Start: <t:${Math.floor(event.scheduledStartTimestamp / 1000)}:F>`,
                            event.scheduledEndTimestamp
                                ? `End: <t:${Math.floor(event.scheduledEndTimestamp / 1000)}:F>`
                                : 'No end time set'
                        ].join('\\n'),
                        inline: false
                    }
                ])

            if (event.channel) {
                embed.addFields({
                    name: 'Channel',
                    value: `<#${event.channel.id}>`,
                    inline: true
                })
            }

            if (event.description) {
                embed.addFields({
                    name: 'Description',
                    value:
                        event.description.length > 1024
                            ? event.description.substring(0, 1021) + '...'
                            : event.description,
                    inline: false
                })
            }

            embed.setTimestamp().setFooter({ text: `Event ID: ${event.id}` })

            if (event.image) {
                embed.setImage(event.coverImageURL())
            }

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log(`Error in guildScheduledEventCreate event: ${error.message}`, 'error')
        }
    }
}
