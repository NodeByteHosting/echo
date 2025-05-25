import { Events } from 'discord.js'
import { AuditLogger } from '../../functions/auditLogger.js'

export default {
    event: Events.GuildRoleDelete,
    once: false,
    run: async (client, role) => {
        const auditLogger = new AuditLogger(client)

        // Fetch audit logs to get who deleted the role
        const auditLogs = await role.guild.fetchAuditLogs({
            type: 32, // ROLE_DELETE
            limit: 1
        })
        const executor = auditLogs.entries.first()?.executor

        const embed = auditLogger.createEmbed(
            '🗑️ Role Deleted',
            `**Name:** ${role.name}
**Color:** ${role.hexColor}
**Hoisted:** ${role.hoist ? 'Yes' : 'No'}
**Mentionable:** ${role.mentionable ? 'Yes' : 'No'}
**Position:** ${role.position}
${executor ? `**Deleted By:** ${executor} (\`${executor.id}\`)` : ''}
**ID:** \`${role.id}\``,
            auditLogger.colors.DELETE
        )

        await auditLogger.log(role.guild, 'ROLE_EVENTS', embed, {
            targetId: role.id,
            targetType: 'ROLE',
            performedBy: executor?.id,
            actionType: 'DELETE'
        })
    }
}
