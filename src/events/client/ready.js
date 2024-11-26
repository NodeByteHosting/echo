import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'
import { indexGuildMember } from '../../indexed/users.js'
import { getRoleIds } from '../../functions/getRoleIds.js'

export default {
    event: Events.ClientReady,
    once: true,

    run: async (_, client) => {
        log(`${client.user.tag} is booting up...`, 'info')

        try {
            await client.rpc.presence(client)

            log(`${client.user.tag} is now online!`, 'done')
        } catch (error) {
            log(`${error.message}`, 'error')
        }
    }
}
