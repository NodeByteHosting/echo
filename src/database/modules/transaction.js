// TransactionModule: CRUD for Transaction model
export class TransactionModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async create(data) {
        return this.prisma.transaction.create({ data })
    }

    async findById(id) {
        return this.prisma.transaction.findUnique({ where: { id } })
    }

    async update(id, data) {
        return this.prisma.transaction.update({ where: { id }, data })
    }

    async delete(id) {
        return this.prisma.transaction.delete({ where: { id } })
    }

    async findAll() {
        return this.prisma.transaction.findMany()
    }

    async findByEconomyId(economyId) {
        return this.prisma.transaction.findMany({ where: { economyId } })
    }
}
