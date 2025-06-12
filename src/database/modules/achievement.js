// AchievementModule: CRUD for Achievement model
export class AchievementModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async create(data) {
        return this.prisma.achievement.create({ data })
    }

    async findById(id) {
        return this.prisma.achievement.findUnique({ where: { id } })
    }

    async update(id, data) {
        return this.prisma.achievement.update({ where: { id }, data })
    }

    async delete(id) {
        return this.prisma.achievement.delete({ where: { id } })
    }

    async findAll() {
        return this.prisma.achievement.findMany()
    }
}
