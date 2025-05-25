import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.GuildIntegrationsUpdate,
    once: false,
    run: async (client, integration) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: integration.guildId }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('INTEGRATION_EVENTS')) {
                return
            }

            const logChannel = await integration.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Get updater from audit logs
            const auditLogs = await integration.guild.fetchAuditLogs({
                type: 81, // INTEGRATION_UPDATE
                limit: 1
            })
            const log = auditLogs.entries.first()
            if (!log) {
                return
            }

            const { executor, changes } = log
            const changesList = []

            changes.forEach(change => {
                switch (change.key) {
                    case 'enable_emoticons':
                        changesList.push(
                            `Emoticons: ${change.old ? 'Enabled' : 'Disabled'} → ${change.new ? 'Enabled' : 'Disabled'}`
                        )
                        break
                    case 'expire_behavior':
                        changesList.push(`Expire Behavior: ${change.old} → ${change.new}`)
                        break
                    case 'expire_grace_period':
                        changesList.push(`Grace Period: ${change.old} days → ${change.new} days`)
                        break
                }
            })

            if (changesList.length > 0) {
                const embed = new client.Gateway.EmbedBuilder()
                    .setTitle('🤖 Integration Updated')
                    .setColor(client.colors.warning)
                    .addFields([
                        { name: 'Name', value: integration.name, inline: true },
                        { name: 'Type', value: integration.type, inline: true },
                        { name: 'Updated By', value: executor ? `<@${executor.id}>` : 'Unknown', inline: true },
                        {
                            name: 'Changes',
                            value: changesList.join('\n'),
                            inline: false
                        }
                    ])
                    .setTimestamp()
                    .setFooter({ text: `Integration ID: ${integration.id}` })

                await logChannel.send({ embeds: [embed] })
            }
        } catch (error) {
            log(`Error in guildIntegrationUpdate event: ${error.message}`, 'error')
        }
    }
}
