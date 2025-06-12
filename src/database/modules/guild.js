export class GuildModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    // GuildConfig (main)
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

    // --- Related Models CRUD ---

    // Guild
    async getGuild(id) {
        return this.prisma.guild.findUnique({ where: { id } })
    }
    async updateGuild(id, data) {
        return this.prisma.guild.update({ where: { id }, data })
    }
    async deleteGuild(id) {
        return this.prisma.guild.delete({ where: { id } })
    }
    async findAllGuilds() {
        return this.prisma.guild.findMany()
    }

    // GuildFeatures
    async getFeatures(id) {
        return this.prisma.guildFeatures.findUnique({ where: { id } })
    }
    async updateFeatures(id, data) {
        return this.prisma.guildFeatures.update({ where: { id }, data })
    }
    async deleteFeatures(id) {
        return this.prisma.guildFeatures.delete({ where: { id } })
    }

    // GuildRoles
    async getRoles(id) {
        return this.prisma.guildRoles.findUnique({ where: { id } })
    }
    async updateRoles(id, data) {
        return this.prisma.guildRoles.update({ where: { id }, data })
    }
    async deleteRoles(id) {
        return this.prisma.guildRoles.delete({ where: { id } })
    }

    // GuildAudits
    async getAudits(id) {
        return this.prisma.guildAudits.findUnique({ where: { id } })
    }
    async updateAudits(id, data) {
        return this.prisma.guildAudits.update({ where: { id }, data })
    }
    async deleteAudits(id) {
        return this.prisma.guildAudits.delete({ where: { id } })
    }

    // GuildTickets
    async getTickets(id) {
        return this.prisma.guildTickets.findUnique({ where: { id } })
    }
    async updateTickets(id, data) {
        return this.prisma.guildTickets.update({ where: { id }, data })
    }
    async deleteTickets(id) {
        return this.prisma.guildTickets.delete({ where: { id } })
    }

    // GuildGates
    async getGates(id) {
        return this.prisma.guildGates.findUnique({ where: { id } })
    }
    async updateGates(id, data) {
        return this.prisma.guildGates.update({ where: { id }, data })
    }
    async deleteGates(id) {
        return this.prisma.guildGates.delete({ where: { id } })
    }

    // AuditChannels
    async getAuditChannels(id) {
        return this.prisma.auditChannels.findUnique({ where: { id } })
    }
    async updateAuditChannels(id, data) {
        return this.prisma.auditChannels.update({ where: { id }, data })
    }
    async deleteAuditChannels(id) {
        return this.prisma.auditChannels.delete({ where: { id } })
    }
}
