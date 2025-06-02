export class TicketModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    /**
     * Create a new ticket with Discord thread integration
     * @param {Object} data - Ticket data
     * @returns {Promise<Object>} Created ticket
     */
    async create(data) {
        // Ensure we have the threadId if provided
        const ticketData = {
            ...data,
            threadId: data.threadId || null
        }

        return this.prisma.ticket.create({
            data: ticketData,
            include: {
                user: true,
                assignedAgent: true
            }
        })
    }

    /**
     * Find ticket by Discord thread ID
     * @param {string} threadId - Discord thread ID
     * @returns {Promise<Object|null>} Ticket or null
     */
    async findByThreadId(threadId) {
        return this.prisma.ticket.findFirst({
            where: { threadId },
            include: {
                user: true,
                assignedAgent: true,
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        })
    }

    async assign(ticketId, agentId) {
        return this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                assignedTo: agentId,
                status: 'IN_PROGRESS'
            },
            include: {
                assignedAgent: true
            }
        })
    }

    async updateStatus(ticketId, status) {
        const updates = {
            status,
            ...(status === 'CLOSED' ? { closedAt: new Date() } : {})
        }

        return this.prisma.ticket.update({
            where: { id: ticketId },
            data: updates
        })
    }

    async addMessage(ticketId, senderId, content, isInternal = false) {
        return this.prisma.message.create({
            data: {
                content,
                isInternal,
                ticket: { connect: { id: ticketId } },
                sender: { connect: { id: senderId } }
            }
        })
    }

    /**
     * Find open tickets for a specific user
     * @param {BigInt} userId - The user ID
     * @returns {Promise<Object|null>} The open ticket or null
     */
    async findOpenTicketByUserId(userId) {
        return this.prisma.ticket.findFirst({
            where: {
                userId: userId,
                status: {
                    in: ['OPEN', 'IN_PROGRESS']
                }
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        })
    }

    /**
     * Get all open tickets
     * @returns {Promise<Array>} Array of open tickets
     */
    async getAllOpenTickets() {
        return this.prisma.ticket.findMany({
            where: {
                status: {
                    in: ['OPEN', 'IN_PROGRESS']
                }
            },
            orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
            include: {
                user: true,
                assignedAgent: true
            }
        })
    }

    /**
     * Get tickets assigned to a specific agent
     * @param {BigInt} agentId - The agent ID
     * @returns {Promise<Array>} Array of assigned tickets
     */
    async getTicketsByAgent(agentId) {
        return this.prisma.ticket.findMany({
            where: {
                assignedTo: agentId,
                status: {
                    not: 'CLOSED'
                }
            },
            include: {
                user: true,
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 3
                }
            }
        })
    }

    /**
     * Get recent closed tickets
     * @param {number} limit - Maximum number of tickets to return
     * @returns {Promise<Array>} Array of closed tickets
     */
    async getRecentClosedTickets(limit = 10) {
        return this.prisma.ticket.findMany({
            where: {
                status: 'CLOSED'
            },
            orderBy: {
                closedAt: 'desc'
            },
            take: limit,
            include: {
                user: true,
                assignedAgent: true
            }
        })
    }

    /**
     * Update a ticket's priority
     * @param {number} ticketId - Ticket ID
     * @param {number} priority - New priority (1-5)
     * @returns {Promise<Object>} Updated ticket
     */
    async updatePriority(ticketId, priority) {
        return this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                priority: Math.min(5, Math.max(1, priority)) // Ensure priority is 1-5
            }
        })
    }

    /**
     * Get ticket details with messages
     * @param {number} ticketId - Ticket ID
     * @returns {Promise<Object>} Ticket with messages
     */
    async getTicketDetails(ticketId) {
        return this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                },
                user: true,
                assignedAgent: {
                    include: { user: true }
                }
            }
        })
    }

    /**
     * Search tickets by query
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Matching tickets
     */
    async searchTickets(query, options = {}) {
        const { status, priority, assignedTo, limit = 10 } = options

        return this.prisma.ticket.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { messages: { some: { content: { contains: query, mode: 'insensitive' } } } }
                ],
                ...(status ? { status } : {}),
                ...(priority ? { priority } : {}),
                ...(assignedTo ? { assignedTo: BigInt(assignedTo) } : {})
            },
            orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
            take: limit,
            include: {
                user: true,
                assignedAgent: true
            }
        })
    }

    /**
     * Assign an agent to a ticket and update Discord permissions
     * @param {number} ticketId - Ticket ID
     * @param {BigInt} agentId - Agent ID
     * @param {Object} client - Discord client
     * @returns {Promise<Object>} Updated ticket
     */
    async assignWithDiscord(ticketId, agentId, client) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            select: { threadId: true }
        })

        // Update the database first
        const updatedTicket = await this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                assignedTo: agentId,
                status: 'IN_PROGRESS'
            },
            include: {
                assignedAgent: {
                    include: { user: true }
                }
            }
        })

        // Update Discord thread if threadId exists
        if (ticket?.threadId && client) {
            try {
                // Try to get the thread from Discord
                const thread = await client.channels.fetch(ticket.threadId)
                if (thread) {
                    // Add the agent to the thread
                    const agentUserId = updatedTicket.assignedAgent.user.id.toString()
                    await thread.members.add(agentUserId)

                    // Send assignment message
                    await thread.send({
                        content: `This ticket has been assigned to <@${agentUserId}>.`
                    })
                }
            } catch (error) {
                console.error('Error updating Discord thread:', error)
                // Continue with database update even if Discord fails
            }
        }

        return updatedTicket
    }

    /**
     * Close a ticket and archive the Discord thread
     * @param {number} ticketId - Ticket ID
     * @param {string} resolution - Resolution notes
     * @param {Object} client - Discord client
     * @returns {Promise<Object>} Closed ticket
     */
    async closeWithDiscord(ticketId, resolution, client) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            select: { threadId: true, userId: true }
        })

        // Update the database
        const updatedTicket = await this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                resolution: resolution || 'Ticket closed'
            }
        })

        // Update Discord thread if exists
        if (ticket?.threadId && client) {
            try {
                // Try to get the thread from Discord
                const thread = await client.channels.fetch(ticket.threadId)
                if (thread) {
                    // Send closure message
                    await thread.send({
                        content: `This ticket has been closed. Resolution: ${resolution || 'Ticket resolved'}`
                    })

                    // Create feedback message
                    const row = {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 3, // SUCCESS
                                custom_id: `ticket_feedback_positive_${ticketId}`,
                                label: '👍 Helpful'
                            },
                            {
                                type: 2,
                                style: 4, // DANGER
                                custom_id: `ticket_feedback_negative_${ticketId}`,
                                label: '👎 Not Helpful'
                            }
                        ]
                    }

                    await thread.send({
                        content: `<@${ticket.userId}>, thank you for using our support system! Was this ticket helpful?`,
                        components: [row]
                    })

                    // Archive the thread
                    await thread.setArchived(true)
                }
            } catch (error) {
                console.error('Error updating Discord thread:', error)
                // Continue with database update even if Discord fails
            }
        }

        return updatedTicket
    }

    /**
     * Record ticket feedback
     * @param {number} ticketId - Ticket ID
     * @param {boolean} isPositive - Whether feedback is positive
     * @param {string} comment - Optional feedback comment
     * @returns {Promise<Object>} Updated ticket
     */
    async recordFeedback(ticketId, isPositive, comment = null) {
        return this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                feedback: {
                    create: {
                        rating: isPositive ? 5 : 1,
                        comment
                    }
                }
            }
        })
    }
}
