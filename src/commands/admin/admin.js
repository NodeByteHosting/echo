import { cmdTypes } from '../../configs/cmdTypes.config.js'
import { getRoleIds } from '../../functions/getRoleIds.js'

export default {
    structure: {
        name: 'admin',
        description: 'Execute an administrative command.',
        category: 'admin',
        handlers: {
            cooldown: 15000,
            permissions: ['ADMINISTRATOR']
        },
        options: [
            {
                name: 'users',
                description: 'Manage a user in our database.',
                type: cmdTypes.SUB_COMMAND_GROUP,
                options: [
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
        await interaction.deferReply({ ephemeral: true })

        const subCommandGroup = interaction.options.getSubcommandGroup()
        const subCommand = interaction.options.getSubcommand()

        if (subCommandGroup === 'users' && subCommand === 'permissions') {
            const action = interaction.options.getString('action')
            const user = interaction.options.getUser('user')
            const permission = interaction.options.getString('permissions')

            const dbUser = await client.db.prisma.user.findFirst({
                where: { snowflakeId: user.id },
                include: { roles: true }
            })

            if (!dbUser) {
                return interaction.editReply({
                    content: `The user \`${user.username}\` does not exist in our database.`
                })
            }

            const roleIds = await getRoleIds(client)
            const roleId = roleIds[permission]

            if (!roleId) {
                return interaction.editReply({
                    content: `The permission \`${permission}\` does not exist.`
                })
            }

            if (action === 'add_perms') {
                const hasRole = dbUser.roles.some(role => role.id === roleId)

                if (hasRole) {
                    return interaction.editReply({
                        content: `The user already has the permission \`${permission}\`.`
                    })
                }

                await client.db.prisma.user.update({
                    where: { snowflakeId: user.id },
                    data: {
                        roles: {
                            connect: { id: roleId }
                        }
                    }
                })

                return interaction.editReply({
                    content: `The user has been given the permission \`${permission}\`.`
                })
            } else if (action === 'remove_perms') {
                const hasRole = dbUser.roles.some(role => role.id === roleId)

                if (!hasRole) {
                    return interaction.editReply({
                        content: `The user does not have the permission \`${permission}\`.`
                    })
                }

                await client.db.prisma.user.update({
                    where: { snowflakeId: user.id },
                    data: {
                        roles: {
                            disconnect: { id: roleId }
                        }
                    }
                })

                return interaction.editReply({
                    content: `The permission \`${permission}\` has been removed from the user.`
                })
            }
        }
    }
}
