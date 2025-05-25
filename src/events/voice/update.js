import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'

export default {
    event: Events.VoiceStateUpdate,
    once: false,
    run: async (client, oldState, newState) => {
        try {
            // Get guild configuration
            const guildConfig = await client.db.prisma.guildConfig.findUnique({
                where: { id: newState.guild.id }
            })

            if (!guildConfig?.logChannelId || !guildConfig.auditEvents?.includes('VOICE_EVENTS')) {
                return
            }

            const logChannel = await newState.guild.channels.fetch(guildConfig.logChannelId)
            if (!logChannel) {
                return
            }

            // Determine the type of voice state change
            let title = ''
            let color = client.colors.primary
            let description = ''

            const member = newState.member || oldState.member

            // User joined a voice channel
            if (!oldState.channel && newState.channel) {
                title = '🎙️ Voice Channel Joined'
                color = client.colors.success
                description = `<@${member.id}> joined <#${newState.channelId}>`
            }
            // User left a voice channel
            else if (oldState.channel && !newState.channel) {
                title = '🎙️ Voice Channel Left'
                color = client.colors.error
                description = `<@${member.id}> left <#${oldState.channelId}>`
            }
            // User moved voice channels
            else if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
                title = '🎙️ Voice Channel Moved'
                color = client.colors.warning
                description = `<@${member.id}> moved from <#${oldState.channelId}> to <#${newState.channelId}>`
            }
            // Status changes (mute, deaf, stream, video)
            else {
                const changes = []
                if (oldState.mute !== newState.mute) {
                    changes.push(`Server Mute: ${newState.mute ? 'Enabled' : 'Disabled'}`)
                }
                if (oldState.deaf !== newState.deaf) {
                    changes.push(`Server Deaf: ${newState.deaf ? 'Enabled' : 'Disabled'}`)
                }
                if (oldState.streaming !== newState.streaming) {
                    changes.push(`Streaming: ${newState.streaming ? 'Started' : 'Stopped'}`)
                }
                if (oldState.selfVideo !== newState.selfVideo) {
                    changes.push(`Video: ${newState.selfVideo ? 'Started' : 'Stopped'}`)
                }

                if (changes.length > 0) {
                    title = '🎙️ Voice State Updated'
                    color = client.colors.info
                    description = `<@${member.id}> in <#${newState.channelId}>:\n${changes.join('\n')}`
                } else {
                    return // No relevant changes
                }
            }

            const embed = new client.Gateway.EmbedBuilder()
                .setTitle(title)
                .setColor(color)
                .setDescription(description)
                .setTimestamp()
                .setFooter({ text: `Member ID: ${member.id}` })

            await logChannel.send({ embeds: [embed] })
        } catch (error) {
            log(`Error in voiceStateUpdate event: ${error.message}`, 'error')
        }
    }
}
