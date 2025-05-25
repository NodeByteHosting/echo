import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.GuildEmojiDelete,
    once: false,
    run: async (client, emoji) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: emoji.guild.id }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('EMOJI_EVENTS')) {
                return
            }

            const logChannel = await emoji.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Get deleter from audit logs
            const auditLogs = await emoji.guild.fetchAuditLogs({
                type: 62, // EMOJI_DELETE
                limit: 1
            })
            const deleter = auditLogs.entries.first()?.executor

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('😢 Emoji Removed')
                .setColor(client.colors.error)
                .addFields([
                    { name: 'Name', value: `:${emoji.name}:`, inline: true },
                    { name: 'Removed By', value: deleter ? `<@${deleter.id}>` : 'Unknown', inline: true },
                    { name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true }
                ])
                .setTimestamp()
                .setFooter({ text: `Emoji ID: ${emoji.id}` })
                .setThumbnail(emoji.url)

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log(`Error in emojiDelete event: ${error.message}`, 'error')
        }
    }
}
