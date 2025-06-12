export class EchoModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async create(data) {
        return this.prisma.echo.create({ data })
    }

    async findById(id, include = {}) {
        return this.prisma.echo.findUnique({ where: { id }, include })
    }

    async update(id, data) {
        return this.prisma.echo.update({ where: { id }, data })
    }

    async delete(id) {
        return this.prisma.echo.delete({ where: { id } })
    }

    async findAll(include = {}) {
        return this.prisma.echo.findMany({ include })
    }

    // Relations: fetch with all related settings
    async findWithRelations(id) {
        return this.prisma.echo.findUnique({
            where: { id },
            include: {
                modelSettings: true,
                maintSettings: true,
                coreSettings: true,
                coreBranding: true,
                coreFeatures: true
            }
        })
    }

    async getSettings(id) {
        return this.prisma.echoSettings.findUnique({ where: { id } })
    }
    async updateSettings(id, data) {
        return this.prisma.echoSettings.update({ where: { id }, data })
    }
    async deleteSettings(id) {
        return this.prisma.echoSettings.delete({ where: { id } })
    }

    // EchoBranding
    async getBranding(id) {
        return this.prisma.echoBranding.findUnique({ where: { id } })
    }
    async updateBranding(id, data) {
        return this.prisma.echoBranding.update({ where: { id }, data })
    }
    async deleteBranding(id) {
        return this.prisma.echoBranding.delete({ where: { id } })
    }

    // EchoFeatures
    async getFeatures(id) {
        return this.prisma.echoFeatures.findUnique({ where: { id } })
    }
    async updateFeatures(id, data) {
        return this.prisma.echoFeatures.update({ where: { id }, data })
    }
    async deleteFeatures(id) {
        return this.prisma.echoFeatures.delete({ where: { id } })
    }

    // EchoPrompts
    async getPrompts(id) {
        return this.prisma.echoPrompts.findUnique({ where: { id } })
    }
    async updatePrompts(id, data) {
        return this.prisma.echoPrompts.update({ where: { id }, data })
    }
    async deletePrompts(id) {
        return this.prisma.echoPrompts.delete({ where: { id } })
    }

    // EchoPerformance
    async getPerformance(id) {
        return this.prisma.echoPerformance.findUnique({ where: { id } })
    }
    async updatePerformance(id, data) {
        return this.prisma.echoPerformance.update({ where: { id }, data })
    }
    async deletePerformance(id) {
        return this.prisma.echoPerformance.delete({ where: { id } })
    }

    // EchoModels
    async getModels(id) {
        return this.prisma.echoModels.findUnique({ where: { id } })
    }
    async updateModels(id, data) {
        return this.prisma.echoModels.update({ where: { id }, data })
    }
    async deleteModels(id) {
        return this.prisma.echoModels.delete({ where: { id } })
    }

    // EchoMaintenance
    async getMaintenance(id) {
        return this.prisma.echoMaintenance.findUnique({ where: { id } })
    }
    async updateMaintenance(id, data) {
        return this.prisma.echoMaintenance.update({ where: { id }, data })
    }
    async deleteMaintenance(id) {
        return this.prisma.echoMaintenance.delete({ where: { id } })
    }
}
