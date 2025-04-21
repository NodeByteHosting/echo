import Discord, { Client, Collection, Partials, GatewayIntentBits } from 'discord.js'
import { setClientPresence } from '../handlers/presence.js'
import { MessageHandler } from '../handlers/messages.js'
import { db } from '../database/client.js'
import deploy from '../handlers/deploy.js'
import commands from '../handlers/commands.js'
import events from '../handlers/events.js'

class EchoBot extends Client {
    slash = new Collection()
    private = new Collection()
    select = new Collection()
    modal = new Collection()
    button = new Collection()
    autocomplete = new Collection()
    context = new Collection()

    cooldowns = new Collection()
    triggers = new Collection()

    applicationCommandsArray = []

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent
            ],
            partials: [Partials.Message],
            allowedMentions: { parse: ['users', 'roles'], repliedUser: true }
        })

        this.Gateway = Discord

        this.db = db.getInstance()
        this.rpc = { presence: setClientPresence }

        this.msgHandler = new MessageHandler(this)

        this.logo = 'https://codemeapixel.dev/echobot/EchoChilling.png'
        this.footer = '© 2025 - NodeByte LTD'

        this.colors = {
            primary: '#7289DA',
            error: '#FF0000',
            success: '#00FF00',
            warning: '#FFFF00'
        }
    }

    start = async () => {
        await events(this)
        await commands(this)
        await deploy(this)

        await this.login(process.env.TOKEN)
    }
}

export default EchoBot
