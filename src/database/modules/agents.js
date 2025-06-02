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
}
