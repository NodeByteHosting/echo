import { Events } from 'discord.js'
import { AuditLogger } from '../../functions/auditLogger.js'

export default {
    event: Events.GuildRoleUpdate,
    once: false,
    run: async (client, oldRole, newRole) => {
        const auditLogger = new AuditLogger(client)

        // Fetch audit logs to get who updated the role
        const auditLogs = await newRole.guild.fetchAuditLogs({
            type: 31, // ROLE_UPDATE
            limit: 1
        })
        const executor = auditLogs.entries.first()?.executor

        // Track changes
        const changes = []

        if (oldRole.name !== newRole.name) {
            changes.push(`**Name:** ${auditLogger.formatDiff(oldRole.name, newRole.name)}`)
        }
        if (oldRole.hexColor !== newRole.hexColor) {
            changes.push(`**Color:** ${auditLogger.formatDiff(oldRole.hexColor, newRole.hexColor)}`)
        }
        if (oldRole.hoist !== newRole.hoist) {
            changes.push(
                `**Hoisted:** ${auditLogger.formatDiff(oldRole.hoist ? 'Yes' : 'No', newRole.hoist ? 'Yes' : 'No')}`
            )
        }
        if (oldRole.mentionable !== newRole.mentionable) {
            changes.push(
                `**Mentionable:** ${auditLogger.formatDiff(oldRole.mentionable ? 'Yes' : 'No', newRole.mentionable ? 'Yes' : 'No')}`
            )
        }
        if (oldRole.position !== newRole.position) {
            changes.push(`**Position:** ${auditLogger.formatDiff(oldRole.position, newRole.position)}`)
        }

        // Only log if there were actual changes
        if (changes.length > 0) {
            const embed = auditLogger.createEmbed(
                '✏️ Role Updated',
                `**Role:** ${newRole} (\`${newRole.id}\`)
${executor ? `**Updated By:** ${executor} (\`${executor.id}\`)` : ''}

**Changes:**
${changes.join('\n')}`,
                auditLogger.colors.UPDATE
            )

            await auditLogger.log(newRole.guild, 'ROLE_EVENTS', embed, {
                targetId: newRole.id,
                targetType: 'ROLE',
                performedBy: executor?.id,
                actionType: 'UPDATE'
            })
        }
    }
}
