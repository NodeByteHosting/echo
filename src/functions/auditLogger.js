import { EmbedBuilder } from 'discord.js'

/**
 * Utility class for handling audit log events
 */
export class AuditLogger {
    constructor(client) {
        this.client = client
        this.prisma = client.db.prisma
        this.colors = {
            CREATE: 0x57f287, // Green
            UPDATE: 0xfee75c, // Yellow
            DELETE: 0xed4245, // Red
            MEMBER: 0x5865f2, // Blue
            MOD: 0xeb459e // Pink
        }
    }

    async log(guild, eventType, embed, options = {}) {
        try {
            const { performedBy, targetId, targetType, changes, details, actionType } = options

            // Get guild configuration
            const config = await this.prisma.guildConfig.findUnique({
                where: { id: guild.id }
            })

            // Always store in database regardless of Discord channel config
            await this.prisma.auditLog.create({
                data: {
                    guildId: guild.id,
                    eventType,
                    actionType: actionType || 'UNKNOWN',
                    performedBy: performedBy ? BigInt(performedBy) : null,
                    targetId,
                    targetType,
                    changes,
                    details: details || embed.data.description || null
                }
            })

            // Send to Discord channel if configured
            if (config?.logChannelId && config.auditEvents?.includes(eventType)) {
                const channel = await guild.channels.fetch(config.logChannelId)
                if (channel?.isTextBased()) {
                    await channel.send({ embeds: [embed] })
                }
            }
        } catch (error) {
            console.error(`Error handling audit log: ${error}`)
        }
    }

    /**
     * Format differences between old and new values
     */
    formatDiff(oldValue, newValue) {
        if (oldValue === newValue) {
            return '`No changes`'
        }
        return `\`${oldValue || 'None'}\` → \`${newValue || 'None'}\``
    }

    /**
     * Create a standard audit log embed
     */
    createEmbed(title, description, color) {
        return new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp()
    }

    /**
     * Get audit logs for a guild with optional filters
     */
    async getAuditLogs(guildId, options = {}) {
        const { eventType, performedBy, targetId, targetType, limit = 100, offset = 0, startDate, endDate } = options

        return this.prisma.auditLog.findMany({
            where: {
                guildId,
                ...(eventType && { eventType }),
                ...(performedBy && { performedBy: BigInt(performedBy) }),
                ...(targetId && { targetId }),
                ...(targetType && { targetType }),
                ...(startDate &&
                    endDate && {
                        createdAt: {
                            gte: startDate,
                            lte: endDate
                        }
                    })
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit,
            skip: offset
        })
    }

    /**
     * Get audit logs for a specific target
     */
    async getTargetAuditLogs(guildId, targetId, options = {}) {
        return this.getAuditLogs(guildId, {
            ...options,
            targetId
        })
    }

    /**
     * Get audit logs performed by a specific user
     */
    async getUserAuditLogs(guildId, userId, options = {}) {
        return this.getAuditLogs(guildId, {
            ...options,
            performedBy: userId
        })
    }
}
