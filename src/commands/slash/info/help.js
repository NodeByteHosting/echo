import { filterSlash } from '../../../filters/slash.js'

export default {
    structure: {
        name: 'help',
        category: 'Info',
        description: 'Shows all commands or info about a specific command',
        handlers: {
            cooldown: 15000,
            permissions: []
        },
        options: [
            {
                name: 'command',
                description: 'Command to get info about',
                required: false,
                type: 3
            },
            {
                name: 'private',
                description: 'Send the response privately',
                required: false,
                type: 5
            }
        ]
    },

    run: async (client, interaction) => {
        const cmd = await interaction.options.getString('command')
        const isPrivate = interaction.options.getBoolean('private') ?? true

        if (cmd && !client.slash.get(cmd)) {
            return interaction.reply({
                ephemeral: isPrivate,
                embeds: [
                    new client.Gateway.EmbedBuilder()
                        .setTitle('ERROR: invalid command')
                        .setDescription(`The command \`${cmd}\` does not exist`)
                        .setColor(client.colors.error)
                        .setThumbnail(client.logo)
                        .setTimestamp()
                        .setFooter({
                            text: client.footer,
                            iconURL: client.logo
                        })
                ]
            })
        } else if (cmd && client.slash.get(cmd)) {
            const command = client.slash.get(cmd)
            const name = command.structure.name.charAt(0).toUpperCase() + command.structure.name.slice(1)

            const fields = [
                { name: 'Name', value: name, inline: true },
                { name: 'Category', value: command.structure.category, inline: true },
                {
                    name: 'Cooldown',
                    value: command.structure.handlers.cooldown
                        ? `${command.structure.handlers.cooldown / 1000} seconds`
                        : 'None',
                    inline: true
                },
                {
                    name: 'Permissions',
                    value: command.structure.handlers.permissions.length
                        ? command.structure.handlers.permissions.join(', ')
                        : 'None',
                    inline: true
                }
            ]

            // Add usage examples if command has options
            if (command.structure.options?.length > 0) {
                const usage = command.structure.options
                    .map(opt => {
                        const required = opt.required ? '<' : '['
                        const endBracket = opt.required ? '>' : ']'
                        return `${required}${opt.name}${endBracket}`
                    })
                    .join(' ')

                fields.push({
                    name: 'Usage',
                    value: `\`/${command.structure.name} ${usage}\``,
                    inline: false
                })

                // Add subcommands info if any exist
                const subcommands = command.structure.options.filter(opt => opt.type === 1 || opt.type === 2)
                if (subcommands.length > 0) {
                    fields.push({
                        name: 'Subcommands',
                        value: subcommands.map(sub => `\`${sub.name}\` - ${sub.description}`).join('\n'),
                        inline: false
                    })
                }
            }

            return interaction.reply({
                ephemeral: isPrivate,
                embeds: [
                    new client.Gateway.EmbedBuilder()
                        .setTitle('Command Information')
                        .setColor(client.colors.primary)
                        .setThumbnail(client.logo)
                        .setDescription(command.structure.description || 'No description provided')
                        .addFields(fields)
                        .setTimestamp()
                        .setFooter({
                            text: client.footer,
                            iconURL: client.logo
                        })
                ]
            })
        }

        // Get all command categories
        const categories = [...new Set(client.slash.map(cmd => cmd.structure.category))]
        const fields = []

        for (const category of categories) {
            const commands = await filterSlash({ client, category })
            if (commands.length > 0) {
                fields.push({
                    name: `${category} Commands`,
                    value: commands.join(', ')
                })
            }
        }

        return interaction.reply({
            ephemeral: isPrivate,
            embeds: [
                new client.Gateway.EmbedBuilder()
                    .setTitle('Available Commands')
                    .setColor(client.colors.primary)
                    .setThumbnail(client.logo)
                    .setDescription(
                        'Here are all the available commands! Use `/help <command>` to get detailed information about a specific command.'
                    )
                    .addFields(fields)
                    .setTimestamp()
                    .setFooter({
                        text: client.footer,
                        iconURL: client.logo
                    })
            ]
        })
    }
}
