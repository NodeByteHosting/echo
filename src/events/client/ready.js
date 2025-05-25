import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'
import { aiService } from '../../services/ai.service.js'

export default {
    event: Events.ClientReady,
    once: true,

    run: async (_, client) => {
        log(`${client.user.tag} is booting up...`, 'info')

        try {
            await client.rpc.presence(client)

            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY not configured')
            }
            if (!process.env.TAVILY_API_KEY) {
                throw new Error('TAVILY_API_KEY not configured')
            }

            await aiService.initialize()

            log(`${client.user.tag} is now online!`, 'done')
        } catch (error) {
            log(`Startup error: ${error.message}`, 'error')
            process.exit(1)
        }
    }
}
