// ItemModule: CRUD for Item model
export class ItemModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async create(data) {
        return this.prisma.item.create({ data })
    }

    async findById(id) {
        return this.prisma.item.findUnique({ where: { id } })
    }

    async update(id, data) {
        return this.prisma.item.update({ where: { id }, data })
    }

    async delete(id) {
        return this.prisma.item.delete({ where: { id } })
    }

    async findAll() {
        return this.prisma.item.findMany()
    }
}
