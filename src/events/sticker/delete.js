import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.GuildStickerDelete,
    once: false,
    run: async (client, sticker) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: sticker.guild.id }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('STICKER_EVENTS')) {
                return
            }

            const logChannel = await sticker.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Get deleter from audit logs
            const auditLogs = await sticker.guild.fetchAuditLogs({
                type: 92, // STICKER_DELETE
                limit: 1
            })
            const deleter = auditLogs.entries.first()?.executor

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('🏷️ Sticker Removed')
                .setColor(client.colors.error)
                .addFields([
                    { name: 'Name', value: sticker.name, inline: true },
                    { name: 'Removed by', value: deleter ? `<@${deleter.id}>` : 'Unknown', inline: true },
                    { name: 'Format', value: sticker.format, inline: true }
                ])

            if (sticker.description) {
                embed.addFields({
                    name: 'Description',
                    value: sticker.description,
                    inline: false
                })
            }

            embed
                .setTimestamp()
                .setFooter({ text: `Sticker ID: ${sticker.id}` })
                .setThumbnail(sticker.url)

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log(`Error in stickerDelete event: ${error.message}`, 'error')
        }
    }
}
