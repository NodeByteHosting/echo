// StatisticsModule: CRUD for Statistics model
export class StatisticsModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async create(data) {
        return this.prisma.statistics.create({ data })
    }

    async findById(id) {
        return this.prisma.statistics.findUnique({ where: { id } })
    }

    async findByUserId(userId) {
        return this.prisma.statistics.findUnique({ where: { userId: BigInt(userId) } })
    }

    async update(id, data) {
        return this.prisma.statistics.update({ where: { id }, data })
    }

    async delete(id) {
        return this.prisma.statistics.delete({ where: { id } })
    }

    async findAll() {
        return this.prisma.statistics.findMany()
    }
}
