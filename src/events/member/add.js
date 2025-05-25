import { Events } from 'discord.js'
import { AuditLogger } from '../../functions/auditLogger.js'

export default {
    event: Events.GuildMemberAdd,

    run: async (client, member) => {
        const auditLogger = new AuditLogger(client)

        const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24))

        const embed = auditLogger
            .createEmbed(
                '👋 Member Joined',
                `**Member:** ${member.user} (\`${member.user.id}\`)
**Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>
**Account Age:** ${accountAge} days
**Member Count:** ${member.guild.memberCount}`,
                auditLogger.colors.MEMBER
            )
            .setThumbnail(member.user.displayAvatarURL())

        await auditLogger.log(member.guild, 'MEMBER_EVENTS', embed, {
            targetId: member.user.id,
            targetType: 'USER'
        })
    }
}
