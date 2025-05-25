import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.GuildEmojiCreate,
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

            // Get creator from audit logs
            const auditLogs = await emoji.guild.fetchAuditLogs({
                type: 60, // EMOJI_CREATE
                limit: 1
            })
            const creator = auditLogs.entries.first()?.executor

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('😄 Emoji Added')
                .setColor(client.colors.success)
                .addFields([
                    { name: 'Name', value: `:${emoji.name}:`, inline: true },
                    { name: 'Added By', value: creator ? `<@${creator.id}>` : 'Unknown', inline: true },
                    { name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true },
                    {
                        name: 'Preview',
                        value: `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`,
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ text: `Emoji ID: ${emoji.id}` })
                .setThumbnail(emoji.url)

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log(`Error in emojiCreate event: ${error.message}`, 'error')
        }
    }
}
