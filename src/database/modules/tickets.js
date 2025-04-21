export class TicketModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async create(data) {
        return this.prisma.ticket.create({
            data,
            include: {
                user: true,
                assignedAgent: true
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
}
