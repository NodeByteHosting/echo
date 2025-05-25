import { Events } from 'discord.js'
import { AuditLogger } from '../../functions/auditLogger.js'

export default {
    event: Events.MessageDelete,

    run: async (client, message) => {
        if (message.author?.bot) {
            return
        }

        const auditLogger = new AuditLogger(client)

        const embed = auditLogger.createEmbed(
            '🗑️ Message Deleted',
            `**Channel:** ${message.channel}
**Author:** ${message.author} (\`${message.author.id}\`)
**Content:**\n${message.content || '*No text content*'}`,
            auditLogger.colors.DELETE
        )

        // Add attachment info if any
        if (message.attachments.size > 0) {
            embed.addFields({
                name: 'Attachments',
                value: message.attachments.map(a => `[${a.name}](${a.url})`).join('\\n')
            })
        }

        await auditLogger.log(message.guild, 'MESSAGE_EVENTS', embed, {
            targetId: message.id,
            targetType: 'MESSAGE',
            performedBy: message.author?.id
        })
    }
}
