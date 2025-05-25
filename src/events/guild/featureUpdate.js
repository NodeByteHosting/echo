import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.GuildUpdate,
    once: false,
    run: async (client, oldGuild, newGuild) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: newGuild.id }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('GUILD_EVENTS')) {
                return
            }

            const logChannel = await newGuild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Get updater from audit logs
            const auditLogs = await newGuild.fetchAuditLogs({
                type: 1, // GUILD_UPDATE
                limit: 1
            })
            const updater = auditLogs.entries.first()?.executor

            const changes = []
            const oldFeatures = oldGuild.features
            const newFeatures = newGuild.features

            // Check for added features
            newFeatures.forEach(feature => {
                if (!oldFeatures.includes(feature)) {
                    changes.push(`Added feature: ${feature.replace(/_/g, ' ').toLowerCase()}`)
                }
            })

            // Check for removed features
            oldFeatures.forEach(feature => {
                if (!newFeatures.includes(feature)) {
                    changes.push(`Removed feature: ${feature.replace(/_/g, ' ').toLowerCase()}`)
                }
            })

            if (changes.length > 0) {
                const embed = new client.Gateway.EmbedBuilder()
                    .setTitle('🌟 Guild Features Updated')
                    .setColor(client.colors.warning)
                    .addFields([
                        { name: 'Server Name', value: newGuild.name, inline: true },
                        { name: 'Updated By', value: updater ? `<@${updater.id}>` : 'Unknown', inline: true },
                        {
                            name: 'Changes',
                            value: changes.join('\n'),
                            inline: false
                        },
                        {
                            name: 'Current Features',
                            value:
                                newFeatures.length > 0
                                    ? newFeatures.map(f => `• ${f.replace(/_/g, ' ').toLowerCase()}`).join('\n')
                                    : 'No special features',
                            inline: false
                        }
                    ])
                    .setTimestamp()
                    .setFooter({ text: `Server ID: ${newGuild.id}` })

                await logChannel.send({ embeds: [embed] })
            }
        } catch (error) {
            log(`Error in guildUpdate event: ${error.message}`, 'error')
        }
    }
}
