import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.AutoModerationRuleUpdate,
    once: false,
    run: async (client, oldRule, newRule) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: newRule.guildId }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('AUTOMOD_EVENTS')) {
                return
            }

            const logChannel = await newRule.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Get updater from audit logs
            const auditLogs = await newRule.guild.fetchAuditLogs({
                type: 141, // AUTO_MODERATION_RULE_UPDATE
                limit: 1
            })
            const updater = auditLogs.entries.first()?.executor

            const changes = []

            if (oldRule.name !== newRule.name) {
                changes.push(`Name: "${oldRule.name}" → "${newRule.name}"`)
            }

            if (oldRule.enabled !== newRule.enabled) {
                changes.push(
                    `State: ${oldRule.enabled ? 'Enabled' : 'Disabled'} → ${newRule.enabled ? 'Enabled' : 'Disabled'}`
                )
            }

            // Compare trigger metadata changes
            if (JSON.stringify(oldRule.triggerMetadata) !== JSON.stringify(newRule.triggerMetadata)) {
                changes.push('Trigger conditions were modified')
            }

            // Compare exempt roles
            const oldExemptRoles = oldRule.exemptRoles || []
            const newExemptRoles = newRule.exemptRoles || []
            if (JSON.stringify(oldExemptRoles) !== JSON.stringify(newExemptRoles)) {
                changes.push('Exempt roles were modified')
            }

            // Compare exempt channels
            const oldExemptChannels = oldRule.exemptChannels || []
            const newExemptChannels = newRule.exemptChannels || []
            if (JSON.stringify(oldExemptChannels) !== JSON.stringify(newExemptChannels)) {
                changes.push('Exempt channels were modified')
            }

            // Only send log if there were changes
            if (changes.length > 0) {
                const embed = new client.Gateway.EmbedBuilder()
                    .setTitle('🛡️ AutoMod Rule Updated')
                    .setColor(client.colors.warning)
                    .addFields([
                        { name: 'Name', value: newRule.name, inline: true },
                        { name: 'Updated By', value: updater ? `<@${updater.id}>` : 'Unknown', inline: true },
                        { name: 'Trigger', value: newRule.triggerType, inline: true },
                        {
                            name: 'Changes',
                            value: changes.join('\\n'),
                            inline: false
                        }
                    ])

                if (newRule.exemptRoles?.length > 0) {
                    embed.addFields({
                        name: 'Exempt Roles',
                        value: newRule.exemptRoles.map(id => `<@&${id}>`).join(', '),
                        inline: false
                    })
                }

                if (newRule.exemptChannels?.length > 0) {
                    embed.addFields({
                        name: 'Exempt Channels',
                        value: newRule.exemptChannels.map(id => `<#${id}>`).join(', '),
                        inline: false
                    })
                }

                embed.setTimestamp().setFooter({ text: `Rule ID: ${newRule.id}` })

                await logChannel.send({ embeds: [embed] })
            }
        } catch (error) {
            log.error('Error in autoModerationRuleUpdate event:', error)
        }
    }
}
