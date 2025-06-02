export class GuildModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async getConfig(guildId) {
        return this.prisma.guildConfig.findUnique({
            where: { id: guildId }
        })
    }

    async updateConfig(guildId, data) {
        return this.prisma.guildConfig.upsert({
            where: { id: guildId },
            update: {
                ...data,
                updatedAt: new Date()
            },
            create: {
                id: guildId,
                name: data.name || 'Unknown Guild',
                ...data
            }
        })
    }

    async getChannelConfig(guildId, configType) {
        const config = await this.getConfig(guildId)
        if (!config) {
            return null
        }

        switch (configType) {
            case 'log':
                return config.logChannelId
            case 'modLog':
                return config.modLogChannelId
            case 'supportCategory':
                return config.supportCategoryId
            case 'ticketLog':
                return config.ticketLogChannelId
            case 'welcome':
                return config.welcomeChannelId
            default:
                return null
        }
    }

    async getRoleConfig(guildId, roleType) {
        const config = await this.getConfig(guildId)
        if (!config) {
            return null
        }

        switch (roleType) {
            case 'mod':
                return config.modRoleId
            case 'admin':
                return config.adminRoleId
            case 'support':
                return config.supportRoleId
            default:
                return null
        }
    }

    async updateAuditEvents(guildId, events) {
        return this.prisma.guildConfig.update({
            where: { id: guildId },
            data: { auditEvents: events }
        })
    }

    async getAllGuilds() {
        return this.prisma.guildConfig.findMany()
    }
}
