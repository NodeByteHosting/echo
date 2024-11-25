import { REST, Routes } from 'discord.js'
import { log } from '../functions/logger.js'

const deploy = async client => {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN)

    try {
        log('Started loading application commands.', 'info')

        const commandJsonData = [
            ...Array.from(client.slash.values()).map(c => c.structure.toJSON()),
            ...Array.from(client.context.values()).map(c => c.structure.toJSON())
        ]

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: commandJsonData
        })

        log('Successfully reloaded application (/) commands.', 'done')
    } catch (error) {
        log(`An error occurred while loading application (/) commands: ${error}`, 'error')
    }
}

export default deploy
