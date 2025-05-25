import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.AutoModerationRuleDelete,
    once: false,
    run: async (client, rule) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: rule.guildId }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('AUTOMOD_EVENTS')) {
                return
            }

            const logChannel = await rule.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Get deleter from audit logs
            const auditLogs = await rule.guild.fetchAuditLogs({
                type: 142, // AUTO_MODERATION_RULE_DELETE
                limit: 1
            })
            const deleter = auditLogs.entries.first()?.executor

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('🛡️ AutoMod Rule Deleted')
                .setColor(client.colors.error)
                .addFields([
                    { name: 'Name', value: rule.name, inline: true },
                    { name: 'Deleted By', value: deleter ? `<@${deleter.id}>` : 'Unknown', inline: true },
                    { name: 'Trigger', value: rule.triggerType, inline: true }
                ])

            if (rule.exemptRoles?.length > 0) {
                embed.addFields({
                    name: 'Was Exempt For Roles',
                    value: rule.exemptRoles.map(id => `<@&${id}>`).join(', '),
                    inline: false
                })
            }

            if (rule.exemptChannels?.length > 0) {
                embed.addFields({
                    name: 'Was Exempt In Channels',
                    value: rule.exemptChannels.map(id => `<#${id}>`).join(', '),
                    inline: false
                })
            }

            embed.setTimestamp().setFooter({ text: `Rule ID: ${rule.id}` })

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log.error('Error in autoModerationRuleDelete event:', error)
        }
    }
}
