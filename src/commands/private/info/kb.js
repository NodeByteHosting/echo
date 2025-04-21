import { cmdTypes } from '../../../configs/cmdTypes.config.js'
import { getRoleIds } from '../../../functions/getRoleIds.js'

export default {
    structure: {
        name: 'kb',
        description: 'Interact with the NodeByte Knowledge Base.',
        category: 'kb',
        handlers: {
            cooldown: 15000,
            permissions: ['']
        },
        options: [
            {
                name: 'users',
                description: 'Manage a user in our database.',
                type: cmdTypes.SUB_COMMAND_GROUP,
                options: [
                    {
                        name: 'help',
                        description: 'Get help with managing users.',
                        type: cmdTypes.SUB_COMMAND,
                        required: false
                    },
                    {
                        name: 'permissions',
                        description: 'Add or remove a permission from a user.',
                        type: cmdTypes.SUB_COMMAND,
                        options: [
                            {
                                name: 'action',
                                description: 'The action you want to perform (add or remove).',
                                type: cmdTypes.STRING,
                                required: true,
                                choices: [
                                    { name: 'add', value: 'add_perms' },
                                    { name: 'remove', value: 'remove_perms' }
                                ]
                            },
                            {
                                name: 'user',
                                description: 'The user you want to manage permissions for.',
                                type: cmdTypes.USER,
                                required: true
                            },
                            {
                                name: 'permissions',
                                description: 'The permission you want to manage for the user.',
                                type: cmdTypes.STRING,
                                required: true,
                                choices: [
                                    { name: 'admin', value: 'ADMINISTRATOR' },
                                    { name: 'moderator', value: 'MODERATOR' },
                                    { name: 'support', value: 'SUPPORT' }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    },

    run: async (client, interaction) => {
        switch (interaction.options.getSubcommand()) {
            case 'help': {
                return interaction.reply({
                    embeds: [
                        new client.Gateway.EmbedBuilder()
                            .setTitle('NodeByte Knowledge Base')
                            .setColor(client.colors.primary)
                            .setDescription(
                                'Welcome to the NodeByte Knowledge Base! Here you can find all the information you need to get started with our services.'
                            )
                            .setThumbnail(client.logo)
                            .setTimestamp()
                            .setFooter({
                                text: client.footer,
                                iconURL: client.logo
                            })
                    ]
                })
            }
        }
    }
}
