import { Roles, Permissions } from '../configs/roles.config.js'

/**
 * Class for handling permission checks and user roles
 */
class PermissionHandler {
    constructor(prisma) {
        this.prisma = prisma
    }

    /**
     * Check if a user has a specific permission
     * @param {string} userId The user's Discord ID
     * @param {string} permission The permission to check
     * @returns {Promise<boolean>} Whether the user has the permission
     */
    async hasPermission(userId, permission) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { permissions: true, role: true }
        })

        if (!user) {
            return false
        } // Admin has all permissions
        if (user.role === Roles.ADMIN) {
            return true
        }

        // Get default permissions for the user's role
        const { getDefaultPermissions } = await import('./permissionUtils.js')
        const rolePerms = getDefaultPermissions(user.role)

        // Combine role permissions with user's custom permissions
        const allPerms = [...new Set([...rolePerms, ...user.permissions])]

        // Check if user has the required permission
        return allPerms.includes(permission)
    }

    async hasPermissions(userId, requiredPermissions) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { permissions: true, role: true }
        })

        if (!user) {
            return { hasAll: false, missing: requiredPermissions }
        }

        // Admin has all permissions
        if (user.role === 'ADMIN') {
            return { hasAll: true, missing: [] }
        }

        // Get default permissions for the user's role
        const { getDefaultPermissions } = await import('./permissionUtils.js')
        const rolePerms = getDefaultPermissions(user.role)

        // Combine role permissions with user's custom permissions
        const allPerms = [...new Set([...rolePerms, ...user.permissions])]

        // Check which permissions are missing
        const missingPerms = requiredPermissions.filter(perm => !allPerms.includes(perm))

        return {
            hasAll: missingPerms.length === 0,
            missing: missingPerms
        }
    }
    async canManageTicket(userId, ticketId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, permissions: true, SupportAgent: true }
        })

        if (!user) {
            return false
        }

        // Check for admin or explicit management permission
        if (user.role === 'ADMIN' || (await this.hasPermission(userId, 'MANAGE_TICKETS'))) {
            return true
        }

        // Support agents need PROVIDE_SUPPORT permission
        if (user.role === 'SUPPORT_AGENT' && (await this.hasPermission(userId, 'PROVIDE_SUPPORT'))) {
            const ticket = await this.prisma.ticket.findUnique({
                where: { id: ticketId },
                select: {
                    assignedTo: true,
                    status: true
                }
            })

            // Can manage if assigned or ticket is unassigned
            return !ticket?.assignedTo || ticket.assignedTo === user.SupportAgent?.id
        }

        // Moderators can manage escalated tickets
        if (user.role === 'MODERATOR' && (await this.hasPermission(userId, 'MANAGE_TICKETS'))) {
            const ticket = await this.prisma.ticket.findUnique({
                where: { id: ticketId },
                select: { status: true }
            })
            return ticket?.status === 'ESCALATED'
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
            ADMIN: 4,
            DEVELOPER: 3,
            MODERATOR: 2,
            SUPPORT_AGENT: 1,
            USER: 0
        }
        return hierarchy[role] || 0
    }

    async validatePermission(userId, requiredPermission) {
        const hasPermission = await this.hasPermission(userId, requiredPermission)
        if (!hasPermission) {
            // Get user's actual permissions for better error message
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { permissions: true, role: true }
            })

            const { getDefaultPermissions } = await import('./permissionUtils.js')
            const rolePerms = getDefaultPermissions(user.role)
            const allPerms = [...new Set([...rolePerms, ...(user?.permissions || [])])]

            throw new Error(
                `Missing required permission: ${requiredPermission}. Current permissions: ${allPerms.join(', ')}`
            )
        }
    }

    async validatePermissions(userId, requiredPermissions) {
        const result = await this.hasPermissions(userId, requiredPermissions)
        if (!result.hasAll) {
            throw new Error(`Missing required permissions: ${result.missing.join(', ')}`)
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
