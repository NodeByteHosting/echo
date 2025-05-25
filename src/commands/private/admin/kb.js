import { cmdTypes } from '../../../configs/cmdTypes.config.js'

export default {
    structure: {
        name: 'admin_kb',
        description: 'View and manage knowledge base entries.',
        category: 'admin',
        handlers: {
            cooldown: 5000,
            permissions: ['ADMIN', 'DEVELOPER', 'MODERATOR']
        },
        options: [
            {
                name: 'verify',
                description: 'Verify a knowledge base entry.',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'entry_id',
                        description: 'The ID of the entry to verify.',
                        type: cmdTypes.INTEGER,
                        required: true
                    }
                ]
            },
            {
                name: 'list',
                description: 'List knowledge base entries.',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'category',
                        description: 'Filter by category.',
                        type: cmdTypes.STRING,
                        required: false
                    },
                    {
                        name: 'verified',
                        description: 'Filter by verification status.',
                        type: cmdTypes.BOOLEAN,
                        required: false
                    }
                ]
            },
            {
                name: 'delete',
                description: 'Delete a knowledge base entry.',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'entry_id',
                        description: 'The ID of the entry to delete.',
                        type: cmdTypes.INTEGER,
                        required: true
                    }
                ]
            },
            {
                name: 'stats',
                description: 'View knowledge base statistics.',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'entry_id',
                        description: 'View stats for a specific entry.',
                        type: cmdTypes.INTEGER,
                        required: false
                    }
                ]
            }
        ]
    },

    run: async (client, interaction) => {
        await interaction.deferReply()

        try {
            const subCommand = interaction.options.getSubcommand()
            const prisma = client.db.prisma

            switch (subCommand) {
                case 'verify': {
                    const entryId = interaction.options.getInteger('entry_id')

                    const entry = await prisma.knowledgeBase.findUnique({
                        where: { id: entryId },
                        include: { user: true }
                    })

                    if (!entry) {
                        return interaction.editReply({ content: 'Entry not found.' })
                    }

                    if (entry.isVerified) {
                        return interaction.editReply({ content: 'This entry is already verified.' })
                    }

                    await prisma.knowledgeBase.update({
                        where: { id: entryId },
                        data: { isVerified: true }
                    })

                    return interaction.editReply({
                        content: `✅ Verified knowledge base entry: "${entry.title}"\nContributor: ${entry.user.username}`
                    })
                }

                case 'list': {
                    const category = interaction.options.getString('category')
                    const verifiedStatus = interaction.options.getBoolean('verified')

                    const entries = await prisma.knowledgeBase.findMany({
                        where: {
                            ...(category && { category }),
                            ...(verifiedStatus !== undefined && { isVerified: verifiedStatus })
                        },
                        include: { user: true },
                        orderBy: [{ useCount: 'desc' }, { createdAt: 'desc' }],
                        take: 10
                    })

                    if (entries.length === 0) {
                        return interaction.editReply({ content: 'No entries found matching the criteria.' })
                    }

                    const entriesList = entries
                        .map(entry => {
                            const status = entry.isVerified ? '✅' : '⏳'
                            const rating = entry.ratingCount > 0 ? `⭐${entry.rating.toFixed(1)}` : 'No ratings'
                            return (
                                `${status} [${entry.id}] **${entry.title}**\n` +
                                `${entry.category ? `📁 ${entry.category} | ` : ''}${rating} | 🔍 Used ${entry.useCount} times\n` +
                                `👤 Added by ${entry.user.username}\n`
                            )
                        })
                        .join('\n')

                    return interaction.editReply({
                        content: `📚 Knowledge Base Entries:\n\n${entriesList}`
                    })
                }

                case 'delete': {
                    const entryId = interaction.options.getInteger('entry_id')

                    const entry = await prisma.knowledgeBase.findUnique({
                        where: { id: entryId }
                    })

                    if (!entry) {
                        return interaction.editReply({ content: 'Entry not found.' })
                    }

                    await prisma.knowledgeBase.delete({
                        where: { id: entryId }
                    })

                    return interaction.editReply({
                        content: `🗑️ Deleted knowledge base entry: "${entry.title}"`
                    })
                }

                case 'stats': {
                    const entryId = interaction.options.getInteger('entry_id')

                    if (entryId) {
                        const entry = await prisma.knowledgeBase.findUnique({
                            where: { id: entryId },
                            include: { user: true }
                        })

                        if (!entry) {
                            return interaction.editReply({ content: 'Entry not found.' })
                        }

                        return interaction.editReply({
                            content:
                                `📊 Stats for "${entry.title}"\n\n` +
                                `👤 Added by: ${entry.user.username}\n` +
                                `📅 Created: <t:${Math.floor(entry.createdAt.getTime() / 1000)}:R>\n` +
                                `🔍 Used: ${entry.useCount} times\n` +
                                `⭐ Rating: ${entry.ratingCount > 0 ? `${entry.rating.toFixed(1)} (${entry.ratingCount} ratings)` : 'No ratings'}\n` +
                                `✅ Verified: ${entry.isVerified ? 'Yes' : 'No'}\n` +
                                `🏷️ Tags: ${entry.tags.join(', ') || 'None'}`
                        })
                    }

                    // Global stats
                    const stats = await prisma.$transaction([
                        prisma.knowledgeBase.count(),
                        prisma.knowledgeBase.count({ where: { isVerified: true } }),
                        prisma.knowledgeBase.aggregate({
                            _avg: { rating: true, useCount: true },
                            _sum: { ratingCount: true, useCount: true }
                        })
                    ])

                    return interaction.editReply({
                        content:
                            `📊 Knowledge Base Statistics\n\n` +
                            `📚 Total Entries: ${stats[0]}\n` +
                            `✅ Verified Entries: ${stats[1]}\n` +
                            `⭐ Average Rating: ${stats[2]._avg.rating?.toFixed(1) || 'N/A'}\n` +
                            `🔍 Total Uses: ${stats[2]._sum.useCount}\n` +
                            `📊 Average Uses per Entry: ${Math.round(stats[2]._avg.useCount || 0)}\n` +
                            `📝 Total Ratings: ${stats[2]._sum.ratingCount}`
                    })
                }
            }
            return null // Default return for switch statement
        } catch (error) {
            console.error('Error in kb command:', error)
            return interaction.editReply({
                content: '❌ An error occurred while processing your request.'
            })
        }
    }
}
