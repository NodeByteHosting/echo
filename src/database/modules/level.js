// LevelModule: CRUD for Level model
export class LevelModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async create(data) {
        return this.prisma.level.create({ data })
    }

    async findById(id) {
        return this.prisma.level.findUnique({ where: { id } })
    }

    async findByUserId(userId) {
        return this.prisma.level.findUnique({ where: { userId: BigInt(userId) } })
    }

    async update(id, data) {
        return this.prisma.level.update({ where: { id }, data })
    }

    async delete(id) {
        return this.prisma.level.delete({ where: { id } })
    }

    async findAll() {
        return this.prisma.level.findMany()
    }
}
