import { db } from '@database'

export const checkPermissions = async function ({ perms, user }) {
    let status = false

    const dbUser = await db.user.findFirst({
        where: { snowflakeId: user.id },
        include: { roles: true }
    })

    if (user && dbUser) {
        const userRoles = dbUser.roles.map(role => role.name)

        if (perms.includes('FORUM_ADMIN') && userRoles.includes('FORUM_ADMIN')) {
            status = true
        } else if (perms.includes('FORUM_HELPER') && userRoles.includes('FORUM_HELPER')) {
            status = true
        } else if (perms.includes('FORUM_MODERATOR') && userRoles.includes('FORUM_MODERATOR')) {
            status = true
        } else if (perms.includes('SPOTLIGHT') && userRoles.includes('SPOTLIGHT')) {
            status = true
        } else if (perms.includes('FORUM_USER') && userRoles.includes('FORUM_USER')) {
            status = true
        }
    }

    return status
}
