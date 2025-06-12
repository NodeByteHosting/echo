export class KnowledgeModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async findById(id, include = {}) {
        return this.prisma.knowledgeBase.findUnique({ where: { id }, include })
    }

    async search(query, options = {}) {
        const { category, tags, verified = true, limit = 10 } = options

        return this.prisma.knowledgeBase.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { title: { contains: query, mode: 'insensitive' } },
                            { content: { contains: query, mode: 'insensitive' } }
                        ]
                    },
                    category ? { category } : {},
                    tags?.length ? { tags: { hasSome: tags } } : {},
                    { isVerified: verified }
                ]
            },
            orderBy: [{ useCount: 'desc' }, { rating: 'desc' }],
            take: limit
        })
    }

    async create(data) {
        return this.prisma.knowledgeBase.create({ data })
    }

    async update(id, data) {
        return this.prisma.knowledgeBase.update({ where: { id }, data })
    }

    async delete(id) {
        return this.prisma.knowledgeBase.delete({ where: { id } })
    }

    async verify(id, moderatorId) {
        return this.prisma.knowledgeBase.update({
            where: { id },
            data: {
                isVerified: true,
                verifiedBy: BigInt(moderatorId),
                verifiedAt: new Date()
            }
        })
    }

    async rate(id, rating, userId) {
        const entry = await this.prisma.knowledgeBase.findUnique({
            where: { id },
            select: { rating: true, ratingCount: true }
        })

        if (!entry) {
            throw new Error('Knowledge entry not found')
        }

        const newRating =
            entry.ratingCount > 0 ? (entry.rating * entry.ratingCount + rating) / (entry.ratingCount + 1) : rating

        return this.prisma.knowledgeBase.update({
            where: { id },
            data: {
                rating: newRating,
                ratingCount: { increment: 1 }
            }
        })
    }

    async incrementUseCount(id) {
        return this.prisma.knowledgeBase.update({
            where: { id },
            data: { useCount: { increment: 1 } }
        })
    }

    async getPopular(limit = 5) {
        return this.prisma.knowledgeBase.findMany({
            where: { isVerified: true },
            orderBy: [{ useCount: 'desc' }, { rating: 'desc' }],
            take: limit
        })
    }

    async getByCategory(category, limit = 10) {
        return this.prisma.knowledgeBase.findMany({
            where: {
                category,
                isVerified: true
            },
            orderBy: { useCount: 'desc' },
            take: limit
        })
    }

    // --- Relations ---
    async getUser(id) {
        return this.prisma.knowledgeBase.findUnique({
            where: { id },
            include: { user: true }
        })
    }

    async getByUser(userId, limit = 10) {
        return this.prisma.knowledgeBase.findMany({
            where: { createdBy: BigInt(userId) },
            orderBy: { createdAt: 'desc' },
            take: limit
        })
    }
}
