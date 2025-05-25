import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.StageInstanceCreate,
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
                type: 83, // STAGE_INSTANCE_CREATE
                limit: 1
            })
            const creator = auditLogs.entries.first()?.executor

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('🎭 Stage Started')
                .setColor(client.colors.success)
                .addFields([
                    { name: 'Topic', value: stageInstance.topic || 'No topic set', inline: false },
                    { name: 'Channel', value: `<#${stageInstance.channelId}>`, inline: true },
                    { name: 'Started By', value: creator ? `<@${creator.id}>` : 'Unknown', inline: true },
                    {
                        name: 'Privacy Level',
                        value: stageInstance.privacyLevel === 2 ? 'Guild Only' : 'Public',
                        inline: true
                    }
                ])
                .setTimestamp()
                .setFooter({ text: `Stage ID: ${stageInstance.id}` })

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log(`Error in stageInstanceCreate event: ${error.message}`, 'error')
        }
    }
}
