import { PermissionsBitField } from 'discord.js'
import { log } from '../functions/logger.js'

export async function indexGuildMember(client, member, roleMap) {
    const user = member.user

    if (user.bot) {
        return
    }

    log(`Processing user: ${user.tag}`, 'info')

    const isForumAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator)
    const isForumModerator = member.permissions.has(PermissionsBitField.Flags.ManageMessages)
    const isForumHelper = member.roles.cache.some(role => role.id === '1112494307937615975')
    const isPublicProfile = member.roles.cache.some(role => role.id === '1310753495930114129')
    const isRegularHelper = member.roles.cache.some(role => role.id === '1310753237615513670')
    const isBaseUser = member.roles.cache.some(role => role.id === '1057740419867365549')

    const rolesToConnect = [
        ...(isForumAdmin ? [{ id: roleMap['ADMINISTRATOR'] }] : []),
        ...(isForumModerator ? [{ id: roleMap['MODERATOR'] }] : []),
        ...(isForumHelper ? [{ id: roleMap['SUPPORT'] }] : []),
        ...(isRegularHelper ? [{ id: roleMap['SPOTLIGHT'] }] : []),
        ...(isBaseUser ? [{ id: roleMap['MEMBER'] }] : [])
    ]

    try {
        await client.db.prisma.user.upsert({
            where: { snowflakeId: user.id },
            update: {
                username: user.username,
                globalName: user.globalName,
                avatarUrl: user.displayAvatarURL({ dynamic: true }),
                isAdmin: isForumAdmin,
                isModerator: isForumModerator,
                isHelper: isForumHelper,
                isPublic: isPublicProfile,
                isRegular: isRegularHelper,
                isBaseUser: isBaseUser,
                joinedAt: member.joinedAt,
                roles: { connect: rolesToConnect }
            },
            create: {
                username: user.username,
                globalName: user.globalName,
                snowflakeId: user.id,
                avatarUrl: user.displayAvatarURL({ dynamic: true }),
                isAdmin: isForumAdmin,
                isModerator: isForumModerator,
                isHelper: isForumHelper,
                isPublic: isPublicProfile,
                isRegular: isRegularHelper,
                isBaseUser: isBaseUser,
                joinedAt: member.joinedAt,
                roles: { connect: rolesToConnect }
            }
        })

        log(`User ${user.tag} has been updated in the database.`, 'done')
    } catch (error) {
        log(`User ${user.tag} could not be updated in the database.`, 'error')
        log(`${error.message}`, 'debug')
    }
}
