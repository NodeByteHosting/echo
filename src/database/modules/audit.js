export class AuditModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    /**
     * Create a new audit log entry
     * @param {Object} data - Audit log data
     * @returns {Promise<Object>} The created audit log
     */
    async create(data) {
        return this.prisma.auditLog.create({
            data: {
                guildId: data.guildId,
                eventType: data.eventType,
                actionType: data.actionType,
                performedBy: data.performedBy ? BigInt(data.performedBy) : null,
                targetId: data.targetId,
                targetType: data.targetType,
                changes: data.changes || {},
                details: data.details || null,
                createdAt: new Date()
            }
        })
    }

    /**
     * Get recent audit logs
     * @param {Object} options - Query options
     * @returns {Promise<Array>} List of audit logs
     */
    async getRecent({ guildId, eventType = null, performedBy = null, limit = 50, offset = 0 } = {}) {
        const where = { guildId }

        if (eventType) {
            where.eventType = eventType
        }
        if (performedBy) {
            where.performedBy = BigInt(performedBy)
        }

        return this.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        })
    }

    /**
     * Get audit logs for a specific target
     * @param {string} targetId - The target ID
     * @param {string} targetType - The target type
     * @returns {Promise<Array>} List of audit logs
     */
    async getForTarget(targetId, targetType) {
        return this.prisma.auditLog.findMany({
            where: {
                targetId,
                targetType
            },
            orderBy: { createdAt: 'desc' }
        })
    }
}
