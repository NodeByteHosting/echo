import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.WebhooksUpdate,
    once: false,
    run: async (client, webhook) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: webhook.guildId }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('WEBHOOK_EVENTS')) {
                return
            }

            const logChannel = await webhook.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Get creator from audit logs
            const auditLogs = await webhook.guild.fetchAuditLogs({
                type: 50, // WEBHOOK_CREATE
                limit: 1
            })
            const creator = auditLogs.entries.first()?.executor

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('🔗 Webhook Created')
                .setColor(client.colors.success)
                .addFields([
                    { name: 'Name', value: webhook.name, inline: true },
                    { name: 'Channel', value: `<#${webhook.channelId}>`, inline: true },
                    { name: 'Created By', value: creator ? `<@${creator.id}>` : 'Unknown', inline: true }
                ])
                .setTimestamp()
                .setFooter({ text: `Webhook ID: ${webhook.id}` })

            if (webhook.avatar) {
                embed.setThumbnail(webhook.avatarURL())
            }

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log(`Error in webhookCreate event: ${error.message}`, 'error')
        }
    }
}
