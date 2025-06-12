// TicketFeedbackModule: CRUD for TicketFeedback model
export class TicketFeedbackModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async create(data) {
        return this.prisma.ticketFeedback.create({ data })
    }

    async findById(id) {
        return this.prisma.ticketFeedback.findUnique({ where: { id } })
    }

    async findByTicketId(ticketId) {
        return this.prisma.ticketFeedback.findUnique({ where: { ticketId } })
    }

    async update(id, data) {
        return this.prisma.ticketFeedback.update({ where: { id }, data })
    }

    async delete(id) {
        return this.prisma.ticketFeedback.delete({ where: { id } })
    }

    async findAll() {
        return this.prisma.ticketFeedback.findMany()
    }
}
