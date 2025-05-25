import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.MessageReactionRemove,
    once: false,
    run: async (client, reaction, user) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: reaction.message.guild.id }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('MESSAGE_EVENTS')) {
                return
            }

            // If reaction is partial, fetch it
            if (reaction.partial) {
                try {
                    await reaction.fetch()
                } catch (error) {
                    log(`Error fetching reaction: ${error.message}`, 'error')
                    return
                }
            }

            const logChannel = await reaction.message.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle('⭐ Reaction Removed')
                .setColor(client.colors.error)
                .addFields([
                    { name: 'Channel', value: `<#${reaction.message.channel.id}>`, inline: true },
                    { name: 'Removed by', value: `<@${user.id}>`, inline: true },
                    {
                        name: 'Emoji',
                        value: reaction.emoji.id
                            ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
                            : reaction.emoji.name,
                        inline: true
                    },
                    {
                        name: 'Message Link',
                        value: `[Jump to Message](${reaction.message.url})`,
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ text: `Message ID: ${reaction.message.id}` })

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log(`Error in messageReactionRemove event: ${error.message}`, 'error')
        }
    }
}
