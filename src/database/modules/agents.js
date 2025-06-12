export class AgentModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async create(userId) {
        return this.prisma.supportAgent.create({
            data: {
                user: { connect: { id: userId } }
            },
            include: {
                user: true
            }
        })
    }

    async getAssignedTickets(agentId) {
        return this.prisma.ticket.findMany({
            where: {
                assignedTo: agentId,
                status: { not: 'CLOSED' }
            },
            include: {
                user: true,
                messages: true
            }
        })
    }

    async toggleActive(agentId, isActive) {
        return this.prisma.supportAgent.update({
            where: { id: agentId },
            data: { isActive }
        })
    }

    /**
     * Find an available support agent
     * @returns {Promise<Object|null>} Available agent or null
     */
    async findAvailableAgent() {
        return this.prisma.supportAgent.findFirst({
            where: {
                isActive: true,
                tickets: {
                    every: {
                        status: {
                            in: ['RESOLVED', 'CLOSED']
                        }
                    }
                }
            },
            include: {
                user: true
            }
        })
    }

    /**
     * Get all active agents
     * @returns {Promise<Array>} Array of active agents
     */
    async getAllActiveAgents() {
        return this.prisma.supportAgent.findMany({
            where: {
                isActive: true
            },
            include: {
                user: true,
                tickets: {
                    where: {
                        status: {
                            not: 'CLOSED'
                        }
                    }
                }
            }
        })
    }

    /**
     * Get agent by user ID
     * @param {BigInt} userId - The user ID
     * @returns {Promise<Object|null>} Agent or null
     */
    async getAgentByUserId(userId) {
        return this.prisma.supportAgent.findFirst({
            where: {
                userId: userId
            },
            include: {
                user: true
            }
        })
    }

    /**
     * Get agent by agent ID
     * @param {BigInt} agentId - The agent's ID
     * @returns {Promise<Object|null>} Agent or null
     */
    async getAgentById(agentId) {
        return this.prisma.supportAgent.findUnique({
            where: { id: agentId },
            include: {
                user: true,
                tickets: true,
                Ticket: true
            }
        })
    }

    /**
     * Update agent fields
     * @param {BigInt} agentId
     * @param {Object} data
     * @returns {Promise<Object>} Updated agent
     */
    async updateAgent(agentId, data) {
        return this.prisma.supportAgent.update({
            where: { id: agentId },
            data,
            include: {
                user: true,
                tickets: true,
                Ticket: true
            }
        })
    }

    /**
     * Delete an agent
     * @param {BigInt} agentId
     * @returns {Promise<Object>} Deleted agent
     */
    async deleteAgent(agentId) {
        return this.prisma.supportAgent.delete({
            where: { id: agentId }
        })
    }

    /**
     * Batch deactivate agents
     * @param {Array<BigInt>} agentIds
     * @returns {Promise<Object>} Result
     */
    async batchDeactivateAgents(agentIds) {
        return this.prisma.supportAgent.updateMany({
            where: { id: { in: agentIds } },
            data: { isActive: false }
        })
    }

    /**
     * Get agent statistics (ticket count, active status)
     * @param {BigInt} agentId
     * @returns {Promise<Object>} Stats
     */
    async getAgentStats(agentId) {
        const agent = await this.prisma.supportAgent.findUnique({
            where: { id: agentId },
            include: {
                tickets: true,
                Ticket: true
            }
        })
        return {
            isActive: agent.isActive,
            assignedTickets: agent.tickets.length,
            closedTickets: agent.Ticket.length
        }
    }
}
