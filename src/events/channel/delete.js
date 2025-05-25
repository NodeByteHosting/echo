import { Events } from 'discord.js'
import { AuditLogger } from '../../functions/auditLogger.js'

export default {
    event: Events.ChannelDelete,

    run: async (client, channel) => {
        if (!channel.guild) {
            return
        }

        const auditLogger = new AuditLogger(client)

        // Fetch audit logs to get who deleted the channel
        const auditLogs = await channel.guild.fetchAuditLogs({
            type: 12, // CHANNEL_DELETE
            limit: 1
        })
        const executor = auditLogs.entries.first()?.executor

        const embed = auditLogger.createEmbed(
            '🗑️ Channel Deleted',
            `**Name:** ${channel.name}
**Type:** ${channel.type}
${executor ? `**Deleted By:** ${executor} (\`${executor.id}\`)` : ''}
**Category:** ${channel.parent?.name || 'None'}
**ID:** \`${channel.id}\``,
            auditLogger.colors.DELETE
        )

        await auditLogger.log(channel.guild, 'CHANNEL_EVENTS', embed, {
            targetId: channel.id,
            targetType: 'CHANNEL',
            performedBy: executor?.id,
            actionType: 'DELETE'
        })
    }
}
