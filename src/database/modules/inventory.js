// InventoryModule: CRUD for Inventory model
export class InventoryModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async create(data) {
        return this.prisma.inventory.create({ data })
    }

    async findById(id) {
        return this.prisma.inventory.findUnique({ where: { id } })
    }

    async update(id, data) {
        return this.prisma.inventory.update({ where: { id }, data })
    }

    async delete(id) {
        return this.prisma.inventory.delete({ where: { id } })
    }

    async findAll() {
        return this.prisma.inventory.findMany()
    }

    async findByUser(userId) {
        return this.prisma.inventory.findMany({
            where: { economy: { userId: BigInt(userId) } },
            include: { item: true }
        })
    }
}
