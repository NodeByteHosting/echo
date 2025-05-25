import { Events } from 'discord.js'
import { AuditLogger } from '../../functions/auditLogger.js'

export default {
    event: Events.MessageUpdate,

    run: async (client, oldMessage, newMessage) => {
        if (oldMessage.author?.bot) {
            return
        }
        if (oldMessage.content === newMessage.content) {
            return
        }

        const auditLogger = new AuditLogger(client)

        const embed = auditLogger.createEmbed(
            '✏️ Message Edited',
            `**Channel:** ${oldMessage.channel}
**Author:** ${oldMessage.author} (\`${oldMessage.author.id}\`)
**Message Link:** [Jump to Message](${newMessage.url})

**Before:**
${oldMessage.content || '*No content*'}

**After:**
${newMessage.content || '*No content*'}`,
            auditLogger.colors.UPDATE
        )

        await auditLogger.log(oldMessage.guild, 'MESSAGE_EVENTS', embed, {
            targetId: oldMessage.id,
            targetType: 'MESSAGE',
            performedBy: oldMessage.author?.id
        })
    }
}
