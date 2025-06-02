import { cmdTypes } from '../../../configs/cmdTypes.config.js'
import { PermissionHandler } from '../../../functions/permissions.js'

export default {
    structure: {
        name: 'moderate',
        description: 'Advanced moderation tools',
        category: 'admin',
        handlers: {
            cooldown: 5000,
            permissions: ['ADMIN', 'DEVELOPER', 'MODERATOR']
        },
        options: [
            {
                name: 'history',
                description: 'View moderation history for a user',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'user',
                        description: 'The user to check',
                        type: cmdTypes.USER,
                        required: true
                    }
                ]
            },
            {
                name: 'warn',
                description: 'Issue a warning to a user',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'user',
                        description: 'The user to warn',
                        type: cmdTypes.USER,
                        required: true
                    },
                    {
                        name: 'reason',
                        description: 'Reason for the warning',
                        type: cmdTypes.STRING,
                        required: true
                    }
                ]
            },
            {
                name: 'timeout',
                description: 'Timeout a user',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'user',
                        description: 'The user to timeout',
                        type: cmdTypes.USER,
                        required: true
                    },
                    {
                        name: 'duration',
                        description: 'Timeout duration in minutes',
                        type: cmdTypes.INTEGER,
                        required: true
                    },
                    {
                        name: 'reason',
                        description: 'Reason for the timeout',
                        type: cmdTypes.STRING,
                        required: true
                    }
                ]
            },
            {
                name: 'clear',
                description: 'Clear messages in a channel',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'amount',
                        description: 'Number of messages to clear (max 100)',
                        type: cmdTypes.INTEGER,
                        required: true
                    },
                    {
                        name: 'user',
                        description: 'Only clear messages from this user',
                        type: cmdTypes.USER,
                        required: false
                    }
                ]
            }
        ]
    },

    run: async (client, interaction) => {
        await interaction.deferReply()

        const subCommand = interaction.options.getSubcommand()
        const permHandler = new PermissionHandler(client.db.prisma)

        try {
            switch (subCommand) {
                case 'history': {
                    const targetUser = interaction.options.getUser('user')

                    // Verify permission to view user's history
                    if (!(await permHandler.canModerateUser(interaction.user.id, targetUser.id))) {
                        return interaction.editReply({
                            content: "❌ You don't have permission to view this user's moderation history."
                        })
                    }

                    const history = await client.db.prisma.moderationAction.findMany({
                        where: { userId: targetUser.id },
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                        include: { moderator: true }
                    })

                    if (history.length === 0) {
                        return interaction.editReply({
                            content: '✅ This user has no moderation history.'
                        })
                    }

                    const embed = new client.Gateway.EmbedBuilder()
                        .setTitle(`📋 Moderation History for ${targetUser.username}`)
                        .setColor(client.colors.primary)
                        .setThumbnail(targetUser.displayAvatarURL())
                        .setDescription(
                            history
                                .map(action => {
                                    const date = new Date(action.createdAt).toLocaleDateString()
                                    return `**${action.type}** - ${date}\\n👮 by ${action.moderator.username}\\n📝 ${action.reason}\\n`
                                })
                                .join('\\n')
                        )
                        .setTimestamp()
                        .setFooter({ text: client.footer, iconURL: client.logo })

                    return interaction.editReply({ embeds: [embed] })
                }

                case 'warn': {
                    const targetUser = interaction.options.getUser('user')
                    const reason = interaction.options.getString('reason')

                    // Verify permission to warn the user
                    if (!(await permHandler.canModerateUser(interaction.user.id, targetUser.id))) {
                        return interaction.editReply({
                            content: "❌ You don't have permission to warn this user."
                        })
                    }

                    // Create warning record
                    await client.db.prisma.moderationAction.create({
                        data: {
                            type: 'WARNING',
                            userId: targetUser.id,
                            moderatorId: interaction.user.id,
                            reason
                        }
                    })

                    // Notify the user
                    try {
                        await targetUser.send({
                            embeds: [
                                new client.Gateway.EmbedBuilder()
                                    .setTitle('⚠️ Warning Received')
                                    .setColor(client.colors.warning)
                                    .setDescription(`You have received a warning in ${interaction.guild.name}`)
                                    .addFields([
                                        { name: 'Reason', value: reason, inline: false },
                                        { name: 'Moderator', value: interaction.user.username, inline: true }
                                    ])
                                    .setTimestamp()
                            ]
                        })
                    } catch (error) {
                        console.error('Could not DM user:', error)
                    }

                    return interaction.editReply({
                        content: `✅ Successfully warned ${targetUser.username}.`
                    })
                }

                case 'timeout': {
                    const targetUser = interaction.options.getUser('user')
                    const duration = interaction.options.getInteger('duration')
                    const reason = interaction.options.getString('reason')

                    // Verify permission to timeout the user
                    if (!(await permHandler.canModerateUser(interaction.user.id, targetUser.id))) {
                        return interaction.editReply({
                            content: "❌ You don't have permission to timeout this user."
                        })
                    }

                    const member = await interaction.guild.members.fetch(targetUser.id)
                    if (!member) {
                        return interaction.editReply({
                            content: '❌ Could not find this user in the server.'
                        })
                    }

                    // Apply timeout
                    await member.timeout(duration * 60 * 1000, reason)

                    // Create timeout record
                    await client.db.prisma.moderationAction.create({
                        data: {
                            type: 'TIMEOUT',
                            userId: targetUser.id,
                            moderatorId: interaction.user.id,
                            reason,
                            duration: duration * 60
                        }
                    })

                    // Notify the user
                    try {
                        await targetUser.send({
                            embeds: [
                                new client.Gateway.EmbedBuilder()
                                    .setTitle('⏰ Timeout Received')
                                    .setColor(client.colors.warning)
                                    .setDescription(`You have been timed out in ${interaction.guild.name}`)
                                    .addFields([
                                        { name: 'Duration', value: `${duration} minutes`, inline: true },
                                        { name: 'Reason', value: reason, inline: false },
                                        { name: 'Moderator', value: interaction.user.username, inline: true }
                                    ])
                                    .setTimestamp()
                            ]
                        })
                    } catch (error) {
                        console.error('Could not DM user:', error)
                    }

                    return interaction.editReply({
                        content: `✅ Successfully timed out ${targetUser.username} for ${duration} minutes.`
                    })
                }

                case 'clear': {
                    const amount = Math.min(interaction.options.getInteger('amount'), 100)
                    const targetUser = interaction.options.getUser('user')

                    const messages = await interaction.channel.messages.fetch({ limit: amount })
                    let toDelete = messages

                    if (targetUser) {
                        toDelete = messages.filter(msg => msg.author.id === targetUser.id)
                    }

                    await interaction.channel.bulkDelete(toDelete, true)

                    return interaction.editReply({
                        content: `✅ Successfully cleared ${toDelete.size} messages${
                            targetUser ? ` from ${targetUser.username}` : ''
                        }.`
                    })
                }
            }

            return null
        } catch (error) {
            console.error('Error in moderate command:', error)
            return interaction.editReply({
                content: '❌ An error occurred while processing your request.'
            })
        }
    }
}
