import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.WebhooksUpdate,
    once: false,
    run: async (client, channel) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: channel.guildId }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('WEBHOOK_EVENTS')) {
                return
            }

            const logChannel = await channel.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Get update info from audit logs
            const auditLogs = await channel.guild.fetchAuditLogs({
                type: 51, // WEBHOOK_UPDATE
                limit: 1
            })
            const log = auditLogs.entries.first()
            if (!log) {
                return
            }

            const changes = []
            const { executor, changes: auditChanges, target } = log

            auditChanges.forEach(change => {
                switch (change.key) {
                    case 'name':
                        changes.push(`Name: "${change.old}" → "${change.new}"`)
                        break
                    case 'channel_id':
                        changes.push(`Channel: <#${change.old}> → <#${change.new}>`)
                        break
                    case 'avatar_hash':
                        changes.push('Avatar was updated')
                        break
                }
            })

            if (changes.length > 0) {
                const embed = new client.Gateway.EmbedBuilder()
                    .setTitle('🔗 Webhook Updated')
                    .setColor(client.colors.warning)
                    .addFields([
                        { name: 'Webhook', value: target.name, inline: true },
                        { name: 'Channel', value: `<#${channel.id}>`, inline: true },
                        { name: 'Updated By', value: executor ? `<@${executor.id}>` : 'Unknown', inline: true },
                        {
                            name: 'Changes',
                            value: changes.join('\n'),
                            inline: false
                        }
                    ])
                    .setTimestamp()
                    .setFooter({ text: `Webhook ID: ${target.id}` })

                if (target.avatar) {
                    embed.setThumbnail(target.avatarURL())
                }

                await logChannel.send({ embeds: [embed] })
            }
        } catch (error) {
            log(`Error in webhookUpdate event: ${error.message}`, 'error')
        }
    }
}
