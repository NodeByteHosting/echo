import { filterSlash } from "../../filters/slash.js";

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
            }
        ]
    },

    run: async (client, interaction) => {

        let cmd = await interaction.options.getString('command');

        if (cmd && !client.slash.get(cmd)) return interaction.reply({
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
        });

        else if (cmd && client.slash.get(cmd)) {

            const command = client.slash.get(cmd);
            const name = command.structure.name.charAt(0).toUpperCase() + command.structure.name.slice(1);

            return interaction.reply({
                embeds: [
                    new client.Gateway.EmbedBuilder()
                        .setTitle('Command Information')
                        .setColor(client.colors.primary)
                        .setThumbnail(client.logo)
                        .setDescription(`${command.structure.description ? command.structure.description : 'No description provided'}`)
                        .addFields({
                            name: 'Name',
                            value: name,
                            inline: true
                        }, {
                            name: 'Category',
                            value: command.structure.category,
                            inline: true
                        }, {
                            name: 'Cooldown',
                            value: command.structure.handlers.cooldown ? `${command.structure.handlers.cooldown / 1000} seconds` : 'None',
                            inline: true
                        }, {
                            name: 'Permissions',
                            value: command.structure.handlers.permissions.length ? command.structure.handlers.permissions.join(', ') : 'None',
                            inline: true
                        })
                        .setTimestamp()
                        .setFooter({
                            text: client.footer,
                            iconURL: client.logo
                        })
                ]
            })
        }

        const info = await filterSlash({ client: client, category: 'Info' });

        return interaction.reply({
            embeds: [
                new client.Gateway.EmbedBuilder()
                    .setTitle('Available Commands')
                    .setColor(client.colors.primary)
                    .setThumbnail(client.logo)
                    .setDescription(`Here are all the available commands!`)
                    .addFields({
                        name: 'Info Commands',
                        value: info.length ? info.join(', ') : 'No commands available'
                    })
                    .setTimestamp()
                    .setFooter({
                        text: client.footer,
                        iconURL: client.logo
                    })
            ]
        })

    }
}