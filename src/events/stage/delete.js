import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.StageInstanceDelete,
    once: false,
    run: async (client, stageInstance) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: stageInstance.guild.id }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('STAGE_EVENTS')) {
                return
            }

            const logChannel = await stageInstance.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Get creator from audit logs
            const auditLogs = await stageInstance.guild.fetchAuditLogs({
                type: 85, // STAGE_INSTANCE_DELETE
                limit: 1
            })
            const ender = auditLogs.entries.first()?.executor

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('🎭 Stage Ended')
                .setColor(client.colors.error)
                .addFields([
                    { name: 'Topic', value: stageInstance.topic || 'No topic set', inline: false },
                    { name: 'Channel', value: `<#${stageInstance.channelId}>`, inline: true },
                    { name: 'Ended By', value: ender ? `<@${ender.id}>` : 'Unknown', inline: true }
                ])
                .setTimestamp()
                .setFooter({ text: `Stage ID: ${stageInstance.id}` })

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log(`Error in stageInstanceDelete event: ${error.message}`, 'error')
        }
    }
}
