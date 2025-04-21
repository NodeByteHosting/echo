import { Events } from 'discord.js'

/**
 * Command mapping object that defines available commands and their aliases
 * Format: { commandName: [primaryCommand, ...aliases] }
 */
const COMMANDS = {
    help: ['help', 'h'],
    support: ['support', 'sp'],
    legal: ['legal', 'tos', 'privacy']
}

/**
 * Message Command Handler
 * Handles bot mention commands in the format: @bot <command>
 *
 * Features:
 * - Command alias support
 * - Automatic help fallback
 * - Bot mention validation
 * - Guild-only commands
 * - Case-insensitive command matching
 *
 * Example Usage:
 * @EchoBot help    - Shows help message
 * @EchoBot h       - Shows help message (alias)
 * @EchoBot support - Shows support information
 * @EchoBot sp      - Shows support information (alias)
 */
export default {
    event: Events.MessageCreate,
    run: async (client, message) => {
        // Ignore bot messages and DMs
        if (message.author.bot) {
            return
        }
        if (!message.guild) {
            return
        }

        // Check for bot mention pattern
        const mention = new RegExp(`^<@!?${client.user.id}> ?`)
        const args = message.content.split(' ')
        const req = args[1]?.trim()?.toLowerCase() // Command name (lowercase for case-insensitive matching)
        const bot = args[0] // Bot mention

        // Exit if message doesn't start with bot mention
        if (!mention.test(bot)) {
            return
        }

        // Find matching command from aliases
        const command = Object.entries(COMMANDS).find(([_, aliases]) => aliases.includes(req))?.[0]

        // Execute command if found and handler exists
        if (command && client.msgHandler.send[command]) {
            try {
                await client.msgHandler.send[command](message)
                await message.delete()
            } catch (error) {
                console.error('Failed to process command:', error)
            }
            return
        }

        // Default to help command if no valid command specified
        try {
            await client.msgHandler.send.help(message)
            await message.delete()
        } catch (error) {
            console.error('Failed to send help message:', error)
        }
    }
}
