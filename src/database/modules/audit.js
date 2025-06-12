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

    /**
     * Get audit log by ID
     * @param {BigInt|Number} id - The audit log ID
     * @returns {Promise<Object|null>} Audit log or null
     */
    async getById(id) {
        return this.prisma.auditLog.findUnique({
            where: { id: BigInt(id) }
        })
    }

    /**
     * Update an audit log entry
     * @param {BigInt|Number} id - The audit log ID
     * @param {Object} data - Fields to update
     * @returns {Promise<Object>} Updated audit log
     */
    async update(id, data) {
        return this.prisma.auditLog.update({
            where: { id: BigInt(id) },
            data
        })
    }

    /**
     * Delete an audit log entry
     * @param {BigInt|Number} id - The audit log ID
     * @returns {Promise<Object>} Deleted audit log
     */
    async delete(id) {
        return this.prisma.auditLog.delete({
            where: { id: BigInt(id) }
        })
    }

    /**
     * Batch delete audit logs by IDs
     * @param {Array<BigInt|Number>} ids
     * @returns {Promise<Object>} Result
     */
    async batchDelete(ids) {
        return this.prisma.auditLog.deleteMany({
            where: { id: { in: ids.map(BigInt) } }
        })
    }

    /**
     * Get audit logs by date range
     * @param {string} guildId
     * @param {Date} start
     * @param {Date} end
     * @param {number} limit
     * @returns {Promise<Array>} List of audit logs
     */
    async getByDateRange(guildId, start, end, limit = 50) {
        return this.prisma.auditLog.findMany({
            where: {
                guildId,
                createdAt: {
                    gte: new Date(start),
                    lte: new Date(end)
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        })
    }

    /**
     * Get audit log statistics for a guild
     * @param {string} guildId
     * @returns {Promise<Object>} Stats
     */
    async getStats(guildId) {
        const total = await this.prisma.auditLog.count({ where: { guildId } })
        const recent = await this.prisma.auditLog.findMany({
            where: { guildId },
            orderBy: { createdAt: 'desc' },
            take: 5
        })
        return { total, recent }
    }
}
