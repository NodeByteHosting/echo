import { ActivityType } from 'discord.js'

export const setClientPresence = async client => {
    const presences = [{ name: 'in the forest', type: ActivityType.Playing }]

    client.user.setStatus('idle')

    setInterval(() => {
        const presence = presences[Math.floor(Math.random() * presences.length)]

        client.user.setActivity({
            name: presence.name,
            type: presence.type
        })
    }, 10000)
}
