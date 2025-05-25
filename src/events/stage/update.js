import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.StageInstanceUpdate,
    once: false,
    run: async (client, oldStageInstance, newStageInstance) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: newStageInstance.guild.id }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('STAGE_EVENTS')) {
                return
            }

            const logChannel = await newStageInstance.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Track changes
            const changes = []

            if (oldStageInstance.topic !== newStageInstance.topic) {
                changes.push(`Topic: "${oldStageInstance.topic}" → "${newStageInstance.topic}"`)
            }

            if (oldStageInstance.privacyLevel !== newStageInstance.privacyLevel) {
                const oldPrivacy = oldStageInstance.privacyLevel === 2 ? 'Guild Only' : 'Public'
                const newPrivacy = newStageInstance.privacyLevel === 2 ? 'Guild Only' : 'Public'
                changes.push(`Privacy: ${oldPrivacy} → ${newPrivacy}`)
            }

            if (changes.length > 0) {
                // Get updater from audit logs
                const auditLogs = await newStageInstance.guild.fetchAuditLogs({
                    type: 84, // STAGE_INSTANCE_UPDATE
                    limit: 1
                })
                const updater = auditLogs.entries.first()?.executor

                const embed = new client.Gateway.EmbedBuilder()
                    .setTitle('🎭 Stage Updated')
                    .setColor(client.colors.warning)
                    .addFields([
                        { name: 'Channel', value: `<#${newStageInstance.channelId}>`, inline: true },
                        { name: 'Updated By', value: updater ? `<@${updater.id}>` : 'Unknown', inline: true },
                        {
                            name: 'Changes',
                            value: changes.join('\n'),
                            inline: false
                        }
                    ])
                    .setTimestamp()
                    .setFooter({ text: `Stage ID: ${newStageInstance.id}` })

                await logChannel.send({ embeds: [embed] })
            }
        } catch (error) {
            log(`Error in stageInstanceUpdate event: ${error.message}`, 'error')
        }
    }
}
