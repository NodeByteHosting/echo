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
}
