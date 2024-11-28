import { filterSlash } from '../../../filters/slash.js'

export default {
    structure: {
        name: 'invite',
        category: 'Info',
        description: 'Get the invite link for the bot',
        handlers: {
            cooldown: 15000,
            permissions: []
        }
    },

    run: async (client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: true })

            const fetch = await client.db.prisma.user.findFirst({
                where: { snowflakeId: interaction.user.id },
                select: { roles: true },
                cacheStrategy: { ttl: 60 }
            })

            if (!fetch) {
                return interaction.editReply({
                    embeds: [
                        new client.Gateway.EmbedBuilder()
                            .setTitle('ERROR: user not found')
                            .setDescription(
                                "Looks like I can't find you in the database, please contact a staff member"
                            )
                            .setColor(client.colors.error)
                            .setThumbnail(client.logo)
                            .setTimestamp()
                            .setFooter({
                                text: client.footer,
                                iconURL: client.logo
                            })
                    ]
                })
            }

            const userRoles = fetch.roles.map(role => role.name)

            if (userRoles.length < 1 || !userRoles.includes('ADMINISTRATOR')) {
                return interaction.editReply({
                    embeds: [
                        new client.Gateway.EmbedBuilder()
                            .setTitle('ERROR: permission denied')
                            .setDescription(
                                'Hey there, I hate to break it to you but at this time only administrators can use my invite link/command :( This is due to the fact that the Discord client/application is private and unable to be invited by anyone not in our development team. This may however change in the future as my features are expanded.'
                            )
                            .setColor(client.colors.error)
                            .setThumbnail(client.logo)
                            .setTimestamp()
                            .setFooter({
                                text: client.footer,
                                iconURL: client.logo
                            })
                    ]
                })
            }

            return interaction.editReply({
                embeds: [
                    new client.Gateway.EmbedBuilder()
                        .setTitle('Invite Link')
                        .setDescription(
                            `[Click here to invite me to your server](https://discord.com/oauth2/authorize?client_id=1310224920399319040&permissions=431913035840&integration_type=0&scope=bot+applications.commands)`
                        )
                        .setColor(client.colors.success)
                        .setThumbnail(client.logo)
                        .setTimestamp()
                        .setFooter({
                            text: client.footer,
                            iconURL: client.logo
                        })
                ]
            })
        } catch (error) {
            console.error('Error handling interaction:', error)
            return interaction.editReply({
                embeds: [
                    new client.Gateway.EmbedBuilder()
                        .setTitle('ERROR: unknown error')
                        .setDescription(
                            'An unknown error occurred while processing your request. Please try again later.'
                        )
                        .setColor(client.colors.error)
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
