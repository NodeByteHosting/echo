import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.ThreadCreate,
    once: false,
    run: async (client, thread) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: thread.guild.id }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('THREAD_EVENTS')) {
                return
            }

            const logChannel = await thread.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Get thread creator from audit logs
            const auditLogs = await thread.guild.fetchAuditLogs({
                type: 110, // THREAD_CREATE
                limit: 1
            })
            const creator = auditLogs.entries.first()?.executor

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('📘 Thread Created')
                .setColor(client.colors.info)
                .addFields([
                    { name: 'Thread Name', value: thread.name, inline: true },
                    { name: 'Parent Channel', value: `<#${thread.parentId}>`, inline: true },
                    { name: 'Created By', value: creator ? `<@${creator.id}>` : 'Unknown', inline: true },
                    {
                        name: 'Settings',
                        value: [
                            `Auto Archive: ${thread.autoArchiveDuration} minutes`,
                            `Slowmode: ${thread.rateLimitPerUser} seconds`,
                            `Private: ${thread.type === 12 ? 'Yes' : 'No'}`
                        ].join('\\n'),
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ text: `Thread ID: ${thread.id}` })

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log(`Error in threadCreate event: ${error.message}`, 'error')
        }
    }
}
