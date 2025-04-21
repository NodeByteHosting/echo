export const DEFAULT_PERMISSIONS = {
    USER: ['CREATE_TICKET', 'VIEW_TICKET'],
    SUPPORT_AGENT: ['CREATE_TICKET', 'VIEW_TICKET', 'CLOSE_TICKET', 'ASSIGN_TICKET'],
    MODERATOR: ['BAN_USER', 'UNBAN_USER'],
    ADMIN: ['CREATE_TICKET', 'VIEW_TICKET', 'CLOSE_TICKET', 'ASSIGN_TICKET', 'BAN_USER', 'UNBAN_USER', 'MANAGE_ROLES']
}

export const getDefaultPermissions = role => {
    return DEFAULT_PERMISSIONS[role] || []
}

export const validatePermissionChange = (oldRole, newRole, performerRole) => {
    const roleHierarchy = {
        ADMIN: 3,
        MODERATOR: 2,
        SUPPORT_AGENT: 1,
        USER: 0
    }

    const performerLevel = roleHierarchy[performerRole]
    const oldLevel = roleHierarchy[oldRole]
    const newLevel = roleHierarchy[newRole]

    // Can't modify roles of higher or equal level
    if (oldLevel >= performerLevel) {
        return false
    }
    // Can't assign roles of higher or equal level
    if (newLevel >= performerLevel) {
        return false
    }

    return true
}
