import { Events } from 'discord.js'
import { AuditLogger } from '../../functions/auditLogger.js'

export default {
    event: Events.ChannelCreate,

    run: async (client, channel) => {
        if (!channel.guild) {
            return
        }

        const auditLogger = new AuditLogger(client)

        // Fetch audit logs to get who created the channel
        const auditLogs = await channel.guild.fetchAuditLogs({
            type: 10, // CHANNEL_CREATE
            limit: 1
        })
        const creator = auditLogs.entries.first()?.executor

        const embed = auditLogger.createEmbed(
            '📝 Channel Created',
            `**Name:** ${channel.name}
**Type:** ${channel.type}
${creator ? `**Created By:** ${creator} (\`${creator.id}\`)` : ''}
**Category:** ${channel.parent?.name || 'None'}
**ID:** \`${channel.id}\``,
            auditLogger.colors.CREATE
        )

        await auditLogger.log(channel.guild, 'CHANNEL_EVENTS', embed, {
            targetId: channel.id,
            targetType: 'CHANNEL',
            performedBy: creator?.id,
            actionType: 'CREATE'
        })
    }
}
