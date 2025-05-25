import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.GuildEmojiUpdate,
    once: false,
    run: async (client, oldEmoji, newEmoji) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: newEmoji.guild.id }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('EMOJI_EVENTS')) {
                return
            }

            const logChannel = await newEmoji.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Track changes
            const changes = []

            if (oldEmoji.name !== newEmoji.name) {
                changes.push(`Name: :${oldEmoji.name}: → :${newEmoji.name}:`)
            }

            // If there are role restrictions, check for changes
            const oldRoles = Array.from(oldEmoji.roles.cache.keys())
            const newRoles = Array.from(newEmoji.roles.cache.keys())

            if (oldRoles.join(',') !== newRoles.join(',')) {
                const oldRolesList = oldRoles.length ? oldRoles.map(id => `<@&${id}>`).join(', ') : 'None'
                const newRolesList = newRoles.length ? newRoles.map(id => `<@&${id}>`).join(', ') : 'None'
                changes.push(`Role Restrictions: ${oldRolesList} → ${newRolesList}`)
            }

            if (changes.length > 0) {
                // Get updater from audit logs
                const auditLogs = await newEmoji.guild.fetchAuditLogs({
                    type: 61, // EMOJI_UPDATE
                    limit: 1
                })
                const updater = auditLogs.entries.first()?.executor

                const embed = new client.Gateway.EmbedBuilder()
                    .setTitle('🔄 Emoji Updated')
                    .setColor(client.colors.warning)
                    .addFields([
                        {
                            name: 'Emoji',
                            value: `<${newEmoji.animated ? 'a' : ''}:${newEmoji.name}:${newEmoji.id}>`,
                            inline: true
                        },
                        { name: 'Updated By', value: updater ? `<@${updater.id}>` : 'Unknown', inline: true },
                        {
                            name: 'Changes',
                            value: changes.join('\n'),
                            inline: false
                        }
                    ])
                    .setTimestamp()
                    .setFooter({ text: `Emoji ID: ${newEmoji.id}` })
                    .setThumbnail(newEmoji.url)

                await logChannel.send({ embeds: [embed] })
            }
        } catch (error) {
            log(`Error in emojiUpdate event: ${error.message}`, 'error')
        }
    }
}
