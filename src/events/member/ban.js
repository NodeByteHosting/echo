import { Events } from 'discord.js'
import { AuditLogger } from '../../functions/auditLogger.js'

export default {
    event: Events.GuildBanAdd,

    run: async (client, ban) => {
        const auditLogger = new AuditLogger(client)

        // Fetch audit logs to get ban details
        const auditLogs = await ban.guild.fetchAuditLogs({
            type: 22, // MEMBER_BAN_ADD
            limit: 1
        })
        const banLog = auditLogs.entries.first()

        const embed = auditLogger
            .createEmbed(
                '🔨 Member Banned',
                `**Member:** ${ban.user} (\`${ban.user.id}\`)
**Banned By:** ${banLog?.executor ? `${banLog.executor} (\`${banLog.executor.id}\`)` : 'Unknown'}
**Reason:** ${ban.reason || banLog?.reason || 'No reason provided'}`,
                auditLogger.colors.MOD
            )
            .setThumbnail(ban.user.displayAvatarURL())

        await auditLogger.log(ban.guild, 'MOD_EVENTS', embed, {
            targetId: ban.user.id,
            targetType: 'USER',
            performedBy: banLog?.executor?.id,
            actionType: 'BAN'
        })
    }
}
