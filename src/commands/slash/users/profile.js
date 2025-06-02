import { db } from '../../../database/client.js'

export default {
    structure: {
        name: 'profile',
        category: 'Users',
        description: "View your profile or another user's profile.",
        handlers: {
            cooldown: 15000,
            permissions: []
        },
        options: [
            {
                name: 'user',
                type: 6, // USER type
                description: 'The user whose profile you want to view',
                required: false
            }
        ]
    },

    run: async (client, interaction) => {
        await interaction.deferReply()

        // Get the database instance
        const database = db.getInstance()

        // Get target user (mentioned user or self)
        const targetUser = interaction.options.getUser('user') || interaction.user

        try {
            // Try to find the user in the database
            let userData = await database.users.findByDiscordId(targetUser.id)

            // If user doesn't exist, create them
            if (!userData) {
                userData = await database.users.upsertDiscordUser(targetUser)
                console.log(`Created new user profile for ${targetUser.username} (${targetUser.id})`)
            }

            // Get comprehensive user data in parallel for better performance
            const [
                userProfile,
                userStats,
                economy,
                level,
                ticketData,
                conversationData,
                achievementsData,
                moderationData,
                agentData,
                knowledgeData
            ] = await Promise.all([
                // Profile data with badges
                database.prisma.profile.findUnique({
                    where: { userId: userData.id },
                    include: { badges: true, selectedBadge: true }
                }),

                // Statistics
                database.prisma.statistics.findUnique({
                    where: { userId: userData.id }
                }),

                // Economy data
                database.prisma.economy.findUnique({
                    where: { userId: userData.id },
                    include: {
                        inventory: {
                            include: { item: true },
                            take: 5
                        }
                    }
                }),

                // Level data
                database.prisma.level.findUnique({
                    where: { userId: userData.id }
                }),

                // Ticket counts and recent tickets
                Promise.all([
                    database.prisma.ticket.count({
                        where: { userId: userData.id }
                    }),
                    database.prisma.ticket.findMany({
                        where: { userId: userData.id },
                        orderBy: { createdAt: 'desc' },
                        take: 3,
                        select: { title: true, status: true, createdAt: true }
                    })
                ]),

                // Conversation data
                Promise.all([
                    database.prisma.conversationHistory.count({
                        where: { userId: userData.id }
                    }),
                    database.prisma.conversationHistory.count({
                        where: { userId: userData.id, isAiResponse: false }
                    })
                ]),

                // Achievements
                database.prisma.achievement.findMany({
                    where: { users: { some: { id: userData.id } } },
                    select: { name: true, icon: true, type: true }
                }),

                // Moderation received
                database.prisma.moderationLog.count({
                    where: { userId: userData.id }
                }),

                // Support agent data if applicable
                userData.role === 'SUPPORT_AGENT' || userData.role === 'MODERATOR' || userData.role === 'ADMIN'
                    ? database.prisma.supportAgent.findFirst({
                          where: { userId: userData.id },
                          include: {
                              tickets: {
                                  where: { status: { not: 'CLOSED' } },
                                  select: { id: true }
                              }
                          }
                      })
                    : null,

                // Knowledge base contributions
                database.prisma.knowledgeBase.count({
                    where: { createdBy: userData.id }
                })
            ])

            // Extract ticket data
            const [ticketCount, recentTickets] = ticketData

            // Extract conversation data
            const [totalConversations, userMessages] = conversationData

            // Calculate derived stats
            const messagesPerConversation =
                totalConversations > 0 ? Math.round((userMessages / totalConversations) * 10) / 10 : 0

            // Determine if user is agent, mod, etc. based on role
            const isAdmin = userData.role === 'ADMIN'
            const isModerator = userData.role === 'MODERATOR' || isAdmin
            const isSupport = userData.role === 'SUPPORT_AGENT' || isModerator || isAdmin

            // Format the embed
            const embed = new client.Gateway.EmbedBuilder()
                .setTitle(`${targetUser.id === interaction.user.id ? 'Your' : `${targetUser.username}'s`} Profile`)
                .setDescription(userProfile?.bio || 'No bio set.')
                .setColor(client.colors.primary)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields([
                    {
                        name: 'User Info',
                        value: [
                            `**Username:** ${targetUser.username}`,
                            `**Display Name:** ${userData.displayName || targetUser.displayName || targetUser.username}`,
                            `**Role:** ${userData.role || 'USER'}`,
                            `**Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
                            userProfile?.timezone ? `**Timezone:** ${userProfile.timezone}` : ''
                        ]
                            .filter(Boolean)
                            .join('\n'),
                        inline: false
                    }
                ])

            // Add level information if available
            if (level) {
                embed.addFields({
                    name: 'Level',
                    value: [
                        `**Current Level:** ${level.level}`,
                        `**XP:** ${level.xp}/${level.level * 100}`,
                        `**Total XP:** ${level.totalXp}`,
                        `**Messages:** ${level.messageCount}`
                    ].join('\n'),
                    inline: true
                })
            }

            // Add conversation statistics
            embed.addFields({
                name: 'Conversation Stats',
                value: [
                    `**Total Conversations:** ${totalConversations || 0}`,
                    `**Messages Sent:** ${userMessages || 0}`,
                    `**Avg Messages/Conversation:** ${messagesPerConversation}`,
                    knowledgeData > 0 ? `**Knowledge Base Entries:** ${knowledgeData}` : ''
                ]
                    .filter(Boolean)
                    .join('\n'),
                inline: true
            })

            // Add stats if available
            if (userStats) {
                embed.addFields({
                    name: 'Activity',
                    value: [
                        `**Commands Used:** ${userStats.commandsUsed || 0}`,
                        `**Tickets Created:** ${ticketCount || 0}`,
                        `**Last Active:** ${userStats.lastActive ? `<t:${Math.floor(userStats.lastActive.getTime() / 1000)}:R>` : 'Unknown'}`
                    ].join('\n'),
                    inline: true
                })
            }

            // Add economy data if available
            if (economy) {
                embed.addFields({
                    name: 'Economy',
                    value: [
                        `**Balance:** ${economy.balance || 0} coins`,
                        `**Bank:** ${economy.bank || 0} coins`,
                        economy.inventory.length > 0 ? `**Items:** ${economy.inventory.length}` : ''
                    ]
                        .filter(Boolean)
                        .join('\n'),
                    inline: true
                })

                // Add inventory items if available
                if (economy.inventory.length > 0) {
                    embed.addFields({
                        name: 'Top Inventory Items',
                        value: economy.inventory
                            .map(inv => `• ${inv.quantity}x **${inv.item.name}**${inv.equipped ? ' (equipped)' : ''}`)
                            .join('\n'),
                        inline: true
                    })
                }
            }

            // Add achievements if any
            if (achievementsData.length > 0) {
                embed.addFields({
                    name: '🏆 Achievements',
                    value: achievementsData
                        .map(achievement => `• ${achievement.icon} **${achievement.name}**`)
                        .join('\n'),
                    inline: true
                })
            }

            // Add badges if user has any
            if (userProfile?.badges?.length > 0) {
                embed.addFields({
                    name: '🔶 Badges',
                    value: userProfile.badges
                        .map(badge => `${badge.id === userProfile.selectedBadgeId ? '✅ ' : ''}${badge.name}`)
                        .join(', '),
                    inline: true
                })
            }

            // Add recent tickets if any
            if (recentTickets.length > 0) {
                embed.addFields({
                    name: '🎫 Recent Tickets',
                    value: recentTickets
                        .map(
                            ticket =>
                                `• **${ticket.title}** (${ticket.status}) - <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`
                        )
                        .join('\n'),
                    inline: false
                })
            }

            // Add support agent info if applicable
            if (agentData) {
                embed.addFields({
                    name: '💼 Support Agent',
                    value: [
                        `**Status:** ${agentData.isActive ? '🟢 Active' : '🔴 Inactive'}`,
                        `**Open Tickets:** ${agentData.tickets.length}`,
                        `**Total Assigned:** ${userStats?.ticketsClosed || 0}`
                    ].join('\n'),
                    inline: true
                })
            }

            // Add moderation stats if applicable
            if (isModerator && userStats) {
                embed.addFields({
                    name: '🛡️ Moderation Stats',
                    value: [
                        `**Warnings Given:** ${userStats.warningsGiven || 0}`,
                        `**Users Banned:** ${userStats.usersBanned || 0}`,
                        `**Messages Deleted:** ${userStats.messagesDeleted || 0}`
                    ].join('\n'),
                    inline: true
                })
            }

            // Add moderation info if user has received any moderation actions
            if (moderationData > 0) {
                embed.addFields({
                    name: '⚠️ Moderation History',
                    value: `This user has received ${moderationData} moderation actions.\nUse \`/modlogs user:${targetUser.username}\` for details.`,
                    inline: true
                })
            }

            // Add footer with timestamp
            embed.setFooter({
                text: `Profile last updated: ${userData.updatedAt ? new Date(userData.updatedAt).toLocaleString() : 'Never'}`,
                iconURL: client.logo
            })

            return interaction.editReply({ embeds: [embed] })
        } catch (error) {
            console.error('Error fetching user profile:', error)
            return interaction.editReply({
                content: 'There was an error fetching the profile. Please try again later.',
                ephemeral: true
            })
        }
    }
}
