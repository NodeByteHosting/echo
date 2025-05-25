import { Events } from 'discord.js'
import { AuditLogger } from '../../functions/auditLogger.js'

export default {
    event: Events.GuildRoleCreate,
    once: false,
    run: async (client, role) => {
        const auditLogger = new AuditLogger(client)

        // Fetch audit logs to get who created the role
        const auditLogs = await role.guild.fetchAuditLogs({
            type: 30, // ROLE_CREATE
            limit: 1
        })
        const creator = auditLogs.entries.first()?.executor

        const embed = auditLogger.createEmbed(
            '✨ Role Created',
            `**Name:** ${role}
**Color:** ${role.hexColor}
**Hoisted:** ${role.hoist ? 'Yes' : 'No'}
**Mentionable:** ${role.mentionable ? 'Yes' : 'No'}
**Position:** ${role.position}
${creator ? `**Created By:** ${creator} (\`${creator.id}\`)` : ''}
**ID:** \`${role.id}\``,
            auditLogger.colors.CREATE
        )

        await auditLogger.log(role.guild, 'ROLE_EVENTS', embed, {
            targetId: role.id,
            targetType: 'ROLE',
            performedBy: creator?.id,
            actionType: 'CREATE'
        })
    }
}
