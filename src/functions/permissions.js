import { DEFAULT_PERMISSIONS, validatePermissionChange } from './permissionUtils.js'

/**
 * Manages permission checking and utility functions for user permissions
 */
export class PermissionHandler {
    constructor(prisma) {
        this.prisma = prisma

        // Permission categories for grouping in UI
        this.permissionCategories = {
            'Tickets': [
                'CREATE_TICKET',
                'VIEW_TICKET',
                'CLOSE_TICKET',
                'ASSIGN_TICKET',
                'MANAGE_TICKETS',
                'ESCALATE_TICKET',
                'VIEW_ALL_TICKETS'
            ],
            'User Management': [
                'BAN_USER',
                'UNBAN_USER',
                'WARN_USER',
                'MANAGE_ROLES',
                'VIEW_USER_INFO',
                'MANAGE_USER_PROFILE'
            ],
            'Knowledge Base': ['VIEW_KB', 'CREATE_KB', 'EDIT_KB', 'DELETE_KB', 'VERIFY_KB'],
            'System': [
                'VIEW_SYSTEM_STATUS',
                'VIEW_METRICS',
                'MANAGE_BOT_SETTINGS',
                'VIEW_SERVER_STATUS',
                'RESTART_SERVERS',
                'MODIFY_SERVER_CONFIG'
            ],
            'Support': ['PROVIDE_SUPPORT', 'VIEW_SUPPORT_QUEUE', 'MANAGE_SUPPORT_AGENTS'],
            'Moderation': ['DELETE_MESSAGES', 'TIMEOUT_USER', 'VIEW_AUDIT_LOGS', 'MANAGE_THREADS'],
            'Server Management': ['MANAGE_PTERODACTYL', 'VIEW_SERVER_STATUS', 'RESTART_SERVERS', 'MODIFY_SERVER_CONFIG']
        }
    }

    /**
     * Get the default permissions for a role
     * @param {string} role - The role
     * @returns {Array<string>} Array of permission names
     */
    async getDefaultPermissions(role) {
        return DEFAULT_PERMISSIONS[role] || []
    }

    /**
     * Check if a user has a specific permission
     * @param {BigInt} userId - The user ID
     * @param {string} permission - The permission to check
     * @returns {Promise<boolean>} Whether the user has the permission
     */
    async hasPermission(userId, permission) {
        // FIX: Use select for scalar fields
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, permissions: true }
        })

        if (!user) {
            return false
        }

        // Check role-based permissions
        const rolePermissions = DEFAULT_PERMISSIONS[user.role] || []
        if (rolePermissions.includes(permission)) {
            return true
        }

        // Check custom permissions
        const customPermissions = user.permissions || []
        return customPermissions.includes(permission)
    }

    /**
     * Check if a user has all of the specified permissions
     * @param {BigInt} userId - The user ID
     * @param {Array<string>} permissions - The permissions to check
     * @returns {Promise<boolean>} Whether the user has all permissions
     */
    async hasAllPermissions(userId, permissions) {
        const effectivePermissions = await this.getEffectivePermissions(userId)
        return permissions.every(permission => effectivePermissions.includes(permission))
    }

    /**
     * Check if a user has any of the specified permissions
     * @param {BigInt} userId - The user ID
     * @param {Array<string>} permissions - The permissions to check
     * @returns {Promise<boolean>} Whether the user has any of the permissions
     */
    async hasAnyPermission(userId, permissions) {
        const effectivePermissions = await this.getEffectivePermissions(userId)
        return permissions.some(permission => effectivePermissions.includes(permission))
    }

    /**
     * Get all effective permissions for a user
     * @param {BigInt} userId - The user ID
     * @returns {Promise<Array<string>>} Array of effective permissions
     */
    async getEffectivePermissions(userId) {
        // FIX: Use select for scalar fields
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, permissions: true }
        })

        if (!user) {
            return []
        }

        const rolePermissions = DEFAULT_PERMISSIONS[user.role] || []
        const customPermissions = user.permissions || []

        // Combine and deduplicate permissions
        return [...new Set([...rolePermissions, ...customPermissions])]
    }

    /**
     * Group permissions by category for better UI display
     * @param {Array<string>} permissions - List of permissions
     * @returns {Object} Permissions grouped by category
     */
    groupPermissionsByCategory(permissions) {
        const result = {}

        // Initialize categories
        for (const category of Object.keys(this.permissionCategories)) {
            result[category] = []
        }

        // Add permissions to their categories
        for (const permission of permissions) {
            let found = false

            // Find which category this permission belongs to
            for (const [category, perms] of Object.entries(this.permissionCategories)) {
                if (perms.includes(permission)) {
                    result[category].push(permission)
                    found = true
                    break
                }
            }

            // If not found in any category, add to Other
            if (!found) {
                if (!result['Other']) {
                    result['Other'] = []
                }
                result['Other'].push(permission)
            }
        }

        // Remove empty categories
        return Object.fromEntries(Object.entries(result).filter(([_, perms]) => perms.length > 0))
    }

    /**
     * Helper method to check for a permission or a role
     * @param {BigInt} userId - The user ID
     * @param {string} permission - The permission to check
     * @param {string} role - The role to check (alternative to permission)
     * @returns {Promise<boolean>} Whether the user has the permission or role
     */
    async checkPermissionOrRole(userId, permission, role) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, permissions: true }
        })

        if (!user) {
            return false
        }

        // Check role first
        if (role && user.role === role) {
            return true
        }

        // Then check permission
        return await this.hasPermission(userId, permission)
    }
}
