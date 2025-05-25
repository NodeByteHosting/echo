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

            // Get deleter from audit logs
            const auditLogs = await integration.guild.fetchAuditLogs({
                type: 82, // INTEGRATION_DELETE
                limit: 1
            })
            const deleter = auditLogs.entries.first()?.executor

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('🤖 Integration Removed')
                .setColor(client.colors.error)
                .addFields([
                    { name: 'Name', value: integration.name || 'Unknown', inline: true },
                    { name: 'Type', value: integration.type || 'Unknown', inline: true },
                    { name: 'Removed By', value: deleter ? `<@${deleter.id}>` : 'Unknown', inline: true }
                ])

            if (integration.application) {
                embed.addFields({
                    name: 'Application',
                    value: integration.application.name,
                    inline: false
                })
            }

            embed.setTimestamp().setFooter({ text: `Integration ID: ${integration.id}` })

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log(`Error in guildIntegrationDelete event: ${error.message}`, 'error')
        }
    }
}
