import { Events } from 'discord.js'
import { AuditLogger } from '../../functions/auditLogger.js'

export default {
    event: Events.GuildBanRemove,

    run: async (client, ban) => {
        const auditLogger = new AuditLogger(client)

        // Fetch audit logs to get unban details
        const auditLogs = await ban.guild.fetchAuditLogs({
            type: 23, // MEMBER_BAN_REMOVE
            limit: 1
        })
        const unbanLog = auditLogs.entries.first()

        const embed = auditLogger
            .createEmbed(
                '🔓 Member Unbanned',
                `**Member:** ${ban.user} (\`${ban.user.id}\`)
**Unbanned By:** ${unbanLog?.executor ? `${unbanLog.executor} (\`${unbanLog.executor.id}\`)` : 'Unknown'}
**Reason:** ${unbanLog?.reason || 'No reason provided'}`,
                auditLogger.colors.MOD
            )
            .setThumbnail(ban.user.displayAvatarURL())

        await auditLogger.log(ban.guild, 'MOD_EVENTS', embed, {
            targetId: ban.user.id,
            targetType: 'USER',
            performedBy: unbanLog?.executor?.id,
            actionType: 'UNBAN'
        })
    }
}
