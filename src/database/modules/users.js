export class UserModule {
    constructor(prisma) {
        this.prisma = prisma
    }

    async findById(id, include = {}) {
        return this.prisma.user.findUnique({
            where: { id },
            include
        })
    }

    async findBySnowflake(snowflakeId, include = {}) {
        return this.prisma.user.findFirst({
            where: { snowflakeId },
            include
        })
    }

    async updatePermissions(id, permissions) {
        return this.prisma.user.update({
            where: { id },
            data: { permissions }
        })
    }

    async ban(id, reason, until = null) {
        return this.prisma.user.update({
            where: { id },
            data: {
                isBanned: true,
                banReason: reason,
                bannedUntil: until
            }
        })
    }

    async unban(id) {
        return this.prisma.user.update({
            where: { id },
            data: {
                isBanned: false,
                banReason: null,
                bannedUntil: null
            }
        })
    }
}
