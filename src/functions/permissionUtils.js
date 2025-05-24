import { Roles, Permissions } from '../configs/roles.config.js'

// Define base permissions for each role level
const USER_PERMISSIONS = [
    Permissions.CREATE_TICKET,
    Permissions.VIEW_TICKET,
    Permissions.VIEW_KB,
    Permissions.VIEW_SERVER_STATUS
]

const SUPPORT_AGENT_PERMISSIONS = [
    Permissions.CLOSE_TICKET,
    Permissions.ASSIGN_TICKET,
    Permissions.VIEW_ALL_TICKETS,
    Permissions.PROVIDE_SUPPORT,
    Permissions.VIEW_SUPPORT_QUEUE,
    Permissions.CREATE_KB,
    Permissions.EDIT_KB,
    Permissions.VIEW_METRICS,
    Permissions.VIEW_USER_INFO
]

const MODERATOR_PERMISSIONS = [
    Permissions.BAN_USER,
    Permissions.UNBAN_USER,
    Permissions.WARN_USER,
    Permissions.DELETE_MESSAGES,
    Permissions.TIMEOUT_USER,
    Permissions.VIEW_AUDIT_LOGS,
    Permissions.MANAGE_THREADS,
    Permissions.VERIFY_KB,
    Permissions.ESCALATE_TICKET
]

const DEVELOPER_PERMISSIONS = [
    Permissions.VIEW_SYSTEM_STATUS,
    Permissions.VIEW_METRICS,
    Permissions.MANAGE_BOT_SETTINGS,
    Permissions.MANAGE_PTERODACTYL,
    Permissions.VIEW_SERVER_STATUS,
    Permissions.RESTART_SERVERS,
    Permissions.MODIFY_SERVER_CONFIG,
    Permissions.VIEW_KB,
    Permissions.CREATE_KB,
    Permissions.EDIT_KB
]

const ADMIN_PERMISSIONS = [
    Permissions.MANAGE_ROLES,
    Permissions.MANAGE_TICKETS,
    Permissions.VIEW_ALL_TICKETS,
    Permissions.MANAGE_SUPPORT_AGENTS,
    Permissions.VIEW_USER_INFO,
    Permissions.MANAGE_USER_PROFILE,
    Permissions.VIEW_KB,
    Permissions.CREATE_KB,
    Permissions.EDIT_KB,
    Permissions.DELETE_KB
]

// Create the hierarchical permissions structure
export const DEFAULT_PERMISSIONS = {
    [Roles.USER]: [...USER_PERMISSIONS],
    [Roles.SUPPORT_AGENT]: [...USER_PERMISSIONS, ...SUPPORT_AGENT_PERMISSIONS],
    [Roles.MODERATOR]: [...USER_PERMISSIONS, ...SUPPORT_AGENT_PERMISSIONS, ...MODERATOR_PERMISSIONS],
    [Roles.DEVELOPER]: [
        ...USER_PERMISSIONS,
        ...SUPPORT_AGENT_PERMISSIONS,
        ...MODERATOR_PERMISSIONS,
        ...DEVELOPER_PERMISSIONS
    ],
    [Roles.ADMIN]: [
        ...USER_PERMISSIONS,
        ...SUPPORT_AGENT_PERMISSIONS,
        ...MODERATOR_PERMISSIONS,
        ...DEVELOPER_PERMISSIONS,
        ...ADMIN_PERMISSIONS
    ]
}

export const getDefaultPermissions = role => {
    return DEFAULT_PERMISSIONS[role] || []
}

export const validatePermissionChange = (oldRole, newRole, performerRole) => {
    const roleHierarchy = {
        ADMIN: 4,
        DEVELOPER: 3,
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
