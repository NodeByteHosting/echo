import { Events } from 'discord.js'
import { AuditLogger } from '../../functions/auditLogger.js'

export default {
    event: Events.GuildMemberRemove,

    run: async (client, member) => {
        const auditLogger = new AuditLogger(client)

        // Fetch audit logs to determine if this was a kick
        const auditLogs = await member.guild.fetchAuditLogs({
            type: 20, // MEMBER_KICK
            limit: 1
        })
        const kickLog = auditLogs.entries.first()

        // Only consider it a kick if the audit log entry is recent (last 5 seconds)
        const isKick = kickLog && kickLog.target?.id === member.user.id && kickLog.createdTimestamp > Date.now() - 5000

        const joinDate = Math.floor(member.joinedTimestamp / 1000)
        const roles =
            member.roles.cache
                .filter(role => role.name !== '@everyone')
                .map(role => role.toString())
                .join(', ') || 'None'

        const embed = auditLogger
            .createEmbed(
                isKick ? '👢 Member Kicked' : '👋 Member Left',
                `**Member:** ${member.user} (\`${member.user.id}\`)
**Joined:** <t:${joinDate}:R>
**Roles:** ${roles}
${
    isKick
        ? `**Kicked By:** ${kickLog.executor} (\`${kickLog.executor.id}\`)
**Reason:** ${kickLog.reason || 'No reason provided'}`
        : ''
}`,
                auditLogger.colors.DELETE
            )
            .setThumbnail(member.user.displayAvatarURL())
        await auditLogger.log(member.guild, isKick ? 'MOD_EVENTS' : 'MEMBER_EVENTS', embed, {
            targetId: member.user.id,
            targetType: 'USER',
            performedBy: isKick ? kickLog.executor?.id : null,
            actionType: isKick ? 'KICK' : 'LEAVE'
        })
    }
}
