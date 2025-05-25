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

            // Get creator from audit logs
            const auditLogs = await integration.guild.fetchAuditLogs({
                type: 80, // INTEGRATION_CREATE
                limit: 1
            })
            const creator = auditLogs.entries.first()?.executor

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('🤖 Integration Added')
                .setColor(client.colors.success)
                .addFields([
                    { name: 'Name', value: integration.name, inline: true },
                    { name: 'Type', value: integration.type, inline: true },
                    { name: 'Added By', value: creator ? `<@${creator.id}>` : 'Unknown', inline: true }
                ])

            if (integration.account) {
                embed.addFields({
                    name: 'Account',
                    value: `${integration.account.name} (${integration.account.id})`,
                    inline: false
                })
            }

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
            log(`Error in guildIntegrationCreate event: ${error.message}`, 'error')
        }
    }
}
