export default {
    structure: {
        name: 'profile',
        category: 'Users',
        description: 'View your profile.',
        handlers: {
            cooldown: 15000,
            permissions: []
        }
    },

    run: async (client, interaction) => {
        await interaction.deferReply()

        const fetch = await client.db.prisma.user.findUnique({
            where: { snowflakeId: interaction.user.id },
            include: {
                roles: true,
                posts: true,
                messages: true
            }
        })

        if (!fetch) {
            return interaction.editReply({ content: 'You do not have a profile yet.' })
        }

        const totalPosts = fetch.posts.length
        const totalMessages = fetch.messages.length
        const userRoles = fetch.roles.map(role => role.name).join(', ')

        return interaction.editReply({
            embeds: [
                new client.Gateway.EmbedBuilder()
                    .setTitle('Your Profile')
                    .setDescription('Here is what we currently know about you.')
                    .setColor(client.colors.primary)
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .addFields(
                        {
                            name: 'ID',
                            value: interaction.user.id,
                            inline: true
                        },
                        {
                            name: 'Username',
                            value: fetch.username || interaction.user.username,
                            inline: true
                        },
                        {
                            name: 'Global Name',
                            value: fetch.globalName || interaction.user.globalName,
                            inline: true
                        },
                        {
                            name: 'Administrator',
                            value: fetch.isAdmin ? 'Yes' : 'No',
                            inline: true
                        },
                        {
                            name: 'Moderator',
                            value: fetch.isModerator ? 'Yes' : 'No',
                            inline: true
                        },
                        {
                            name: 'Support Team',
                            value: fetch.isHelper ? 'Yes' : 'No',
                            inline: true
                        },
                        {
                            name: 'Forum: public profile',
                            value: fetch.isPublic ? 'Yes' : 'No',
                            inline: true
                        },
                        {
                            name: 'Forum: posts',
                            value: `${totalPosts ? totalPosts : 'None'}`,
                            inline: true
                        },
                        {
                            name: 'Forum: messages',
                            value: `${totalMessages ? totalMessages : 'None'}`,
                            inline: true
                        },
                        {
                            name: 'Forum: answers',
                            value: `${fetch.answersCount ? fetch.answersCount : 'None'}`,
                            inline: true
                        },
                        {
                            name: 'Roles',
                            value: userRoles || 'None',
                            inline: true
                        },
                        {
                            name: 'Created At',
                            value: interaction.user.createdAt.toUTCString(),
                            inline: true
                        }
                    )
            ]
        })
    }
}
