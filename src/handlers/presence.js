import { ActivityType } from 'discord.js'

export const setClientPresence = async client => {
    const presences = [
        { name: 'with threads', type: ActivityType.Playing },
        { name: 'for new threads', type: ActivityType.Watching }
    ]

    client.user.setStatus('idle')

    setInterval(() => {
        const presence = presences[Math.floor(Math.random() * presences.length)]

        client.user.setActivity({
            name: presence.name,
            type: presence.type
        })
    }, 10000)
}
