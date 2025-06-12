export class ModerationModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async createLog(userId, action, reason, performedBy, expiresAt = null) {
        return this.prisma.moderationLog.create({
            data: {
                userId: BigInt(userId),
                action,
                reason,
                performedBy: performedBy ? BigInt(performedBy) : null,
                expiresAt
            },
            include: {
                targetUser: true,
                moderator: true
            }
        })
    }

    async getUserLogs(userId, limit = 10) {
        return this.prisma.moderationLog.findMany({
            where: { userId: BigInt(userId) },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                moderator: true
            }
        })
    }

    async getModeratorLogs(moderatorId, limit = 10) {
        return this.prisma.moderationLog.findMany({
            where: { performedBy: BigInt(moderatorId) },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                targetUser: true
            }
        })
    }

    async getRecentLogs(limit = 20) {
        return this.prisma.moderationLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                targetUser: true,
                moderator: true
            }
        })
    }

    async getLogsByAction(action, limit = 20) {
        return this.prisma.moderationLog.findMany({
            where: { action },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                targetUser: true,
                moderator: true
            }
        })
    }

    async getLogById(id) {
        return this.prisma.moderationLog.findUnique({
            where: { id: Number(id) },
            include: {
                targetUser: true,
                moderator: true
            }
        })
    }

    async updateLog(id, data) {
        // Only allow updating certain fields
        const allowed = ['action', 'reason', 'expiresAt', 'performedBy']
        const updateData = {}
        for (const key of allowed) {
            if (data[key] !== undefined) {
                updateData[key] = data[key]
            }
        }
        return this.prisma.moderationLog.update({
            where: { id: Number(id) },
            data: updateData,
            include: {
                targetUser: true,
                moderator: true
            }
        })
    }

    async deleteLog(id) {
        return this.prisma.moderationLog.delete({
            where: { id: Number(id) }
        })
    }

    async getLogsByUserAndAction(userId, action, limit = 20) {
        return this.prisma.moderationLog.findMany({
            where: { userId: BigInt(userId), action },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                moderator: true
            }
        })
    }

    async getLogsByDateRange(start, end, limit = 50) {
        return this.prisma.moderationLog.findMany({
            where: {
                createdAt: {
                    gte: new Date(start),
                    lte: new Date(end)
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                targetUser: true,
                moderator: true
            }
        })
    }

    async batchDeleteLogs(ids) {
        return this.prisma.moderationLog.deleteMany({
            where: { id: { in: ids.map(Number) } }
        })
    }

    async getExpiredLogs(now = new Date()) {
        return this.prisma.moderationLog.findMany({
            where: {
                expiresAt: { lte: now }
            },
            include: {
                targetUser: true,
                moderator: true
            }
        })
    }

    async deleteExpiredLogs(now = new Date()) {
        return this.prisma.moderationLog.deleteMany({
            where: {
                expiresAt: { lte: now }
            }
        })
    }

    // Relation helpers
    async getTargetUser(logId) {
        // Get the target user for a moderation log
        const log = await this.prisma.moderationLog.findUnique({
            where: { id: logId },
            include: { targetUser: true }
        })
        return log?.targetUser || null
    }

    async getModerator(logId) {
        // Get the moderator for a moderation log
        const log = await this.prisma.moderationLog.findUnique({
            where: { id: logId },
            include: { moderator: true }
        })
        return log?.moderator || null
    }
}
