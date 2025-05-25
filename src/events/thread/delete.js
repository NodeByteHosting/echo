import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.ThreadDelete,
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

            // Get thread deleter from audit logs
            const auditLogs = await thread.guild.fetchAuditLogs({
                type: 111, // THREAD_DELETE
                limit: 1
            })
            const deleter = auditLogs.entries.first()?.executor

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('🗑️ Thread Deleted')
                .setColor(client.colors.warning)
                .addFields([
                    { name: 'Thread Name', value: thread.name, inline: true },
                    { name: 'Parent Channel', value: `<#${thread.parentId}>`, inline: true },
                    { name: 'Deleted By', value: deleter ? `<@${deleter.id}>` : 'Unknown', inline: true },
                    {
                        name: 'Info',
                        value: [
                            `Message Count: ${thread.messageCount}`,
                            `Created: <t:${Math.floor(thread.createdTimestamp / 1000)}:R>`,
                            `Archived: ${thread.archived ? 'Yes' : 'No'}`
                        ].join('\\n'),
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ text: `Thread ID: ${thread.id}` })

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log(`Error in threadDelete event: ${error.message}`, 'error')
        }
    }
}
