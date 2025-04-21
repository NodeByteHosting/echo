class PermissionHandler {
    constructor(prisma) {
        this.prisma = prisma
    }

    async hasPermission(userId, permission) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { permissions: true, role: true }
        })

        if (!user) {
            return false
        }

        // Admin has all permissions
        if (user.role === 'ADMIN') {
            return true
        }

        // Check specific permission
        return user.permissions.includes(permission)
    }

    async canManageTicket(userId, ticketId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, SupportAgent: true }
        })

        if (!user) {
            return false
        }
        if (user.role === 'ADMIN') {
            return true
        }

        // Support agents can manage tickets assigned to them
        if (user.role === 'SUPPORT_AGENT') {
            const ticket = await this.prisma.ticket.findUnique({
                where: { id: ticketId },
                select: { assignedTo: true }
            })
            return ticket?.assignedTo === user.SupportAgent?.id
        }

        return false
    }

    async canModerateUser(moderatorId, targetUserId) {
        const moderator = await this.prisma.user.findUnique({
            where: { id: moderatorId },
            select: { role: true }
        })

        if (!moderator) {
            return false
        }
        if (moderator.role === 'ADMIN') {
            return true
        }
        if (moderator.role !== 'MODERATOR') {
            return false
        }

        // Moderators can't moderate other moderators or admins
        const target = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            select: { role: true }
        })

        return !['ADMIN', 'MODERATOR'].includes(target.role)
    }

    getRoleHierarchy(role) {
        const hierarchy = {
            ADMIN: 3,
            MODERATOR: 2,
            SUPPORT_AGENT: 1,
            USER: 0
        }
        return hierarchy[role] || 0
    }

    async validatePermission(userId, requiredPermission) {
        const hasPermission = await this.hasPermission(userId, requiredPermission)
        if (!hasPermission) {
            throw new Error(`Missing required permission: ${requiredPermission}`)
        }
    }
}

// Permission decorators for route handlers
const requirePermission = permission => {
    return async (req, res, next) => {
        try {
            const handler = new PermissionHandler(req.prisma)
            await handler.validatePermission(req.user.id, permission)
            next()
        } catch (error) {
            res.status(403).json({ error: error.message })
        }
    }
}

export { PermissionHandler, requirePermission }
