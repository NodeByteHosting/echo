export async function getRoleIds(client) {
    const roles = await client.db.prisma.role.findMany(
        { where: { name: { in: ['ADMINISTRATOR', 'MODERATOR', 'SUPPORT', 'SPOTLIGHT', 'MEMBER'] } } },
        { select: { id: true, name: true } }
    )

    const roleMap = {}
    roles.forEach(role => {
        roleMap[role.name] = role.id
    })

    return roleMap
}
