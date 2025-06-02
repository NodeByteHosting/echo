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
}
