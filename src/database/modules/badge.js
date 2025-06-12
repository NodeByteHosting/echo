// BadgeModule: CRUD for Badge model
export class BadgeModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async create(data) {
        return this.prisma.badge.create({ data })
    }

    async findById(id) {
        return this.prisma.badge.findUnique({ where: { id } })
    }

    async update(id, data) {
        return this.prisma.badge.update({ where: { id }, data })
    }

    async delete(id) {
        return this.prisma.badge.delete({ where: { id } })
    }

    async findAll() {
        return this.prisma.badge.findMany()
    }
}
