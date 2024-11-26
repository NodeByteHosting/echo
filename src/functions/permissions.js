export const checkPermissions = async function ({ client, perms, user }) {
    let status = false

    const dbUser = await client.db.prisma.user.findFirst({
        where: { snowflakeId: user.id },
        include: { roles: true }
    })

    if (user && dbUser) {
        const userRoles = dbUser.roles.map(role => role.name)

        if (perms.includes('ADMINISTRATOR') && userRoles.includes('ADMINISTRATOR')) {
            status = true
        } else if (perms.includes('SUPPORT') && userRoles.includes('SUPPORT')) {
            status = true
        } else if (perms.includes('MODERATOR') && userRoles.includes('MODERATOR')) {
            status = true
        } else if (perms.includes('SPOTLIGHT') && userRoles.includes('SPOTLIGHT')) {
            status = true
        } else if (perms.includes('MEMBER') && userRoles.includes('MEMBER')) {
            status = true
        }
    }

    return status
}
