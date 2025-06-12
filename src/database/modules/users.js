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

    /**
     * Find user by Discord ID with proper querying
     * @param {string} discordId - Discord user ID
     * @param {Object} options - Query options
     * @returns {Promise<Object|null>} User object or null
     */
    async findByDiscordId(discordId, options = {}) {
        const bigIntId = BigInt(discordId)

        // Create a proper query structure
        const query = {
            where: { id: bigIntId }
        }

        // Handle include/select properly
        if (options.include) {
            query.include = options.include
        }

        if (options.select) {
            query.select = options.select
        }

        return this.prisma.user.findUnique(query)
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

    async updateRole(id, role) {
        return this.prisma.user.update({
            where: { id },
            data: {
                role,
                updatedAt: new Date()
            }
        })
    }

    /**
     * Upsert a user from Discord data
     * @param {Object} discordUser - Discord user data
     * @returns {Promise<Object>} The upserted user
     */
    async upsertDiscordUser(discordUser) {
        try {
            // Extract the needed data from Discord user object
            const userData = {
                id: discordUser.id,
                username: discordUser.username,
                displayName: discordUser.displayName || discordUser.username,
                avatar: discordUser.displayAvatarURL?.() || null
            }

            // Find if user already exists by Discord ID
            // Use findByDiscordId instead of findBySnowflake
            const existingUser = await this.findByDiscordId(userData.id)

            if (existingUser) {
                // Update existing user
                return this.prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        username: userData.username,
                        displayName: userData.displayName,
                        updatedAt: new Date()
                    }
                })
            }
            // Create new user
            return this.prisma.user.create({
                data: {
                    id: BigInt(userData.id),
                    username: userData.username,
                    displayName: userData.displayName,
                    role: 'USER',
                    isBanned: false,
                    permissions: []
                }
            })
        } catch (error) {
            console.error('Error upserting Discord user:', error)
            throw error
        }
    }

    /**
     * Find users by role
     * @param {string} role - The role to search for
     * @param {Object} include - Prisma include options
     * @returns {Promise<Array>} List of users with the specified role
     */
    async findByRole(role, include = {}) {
        return this.prisma.user.findMany({
            where: { role },
            include,
            orderBy: { username: 'asc' }
        })
    }

    /**
     * Find users with a specific permission
     * @param {string} permission - The permission to search for
     * @returns {Promise<Array>} List of users with the permission
     */
    async findWithPermission(permission) {
        return this.prisma.user.findMany({
            where: {
                permissions: {
                    has: permission
                }
            },
            orderBy: { username: 'asc' }
        })
    }

    /**
     * Add a permission to a user
     * @param {BigInt} id - User ID
     * @param {string} permission - Permission to add
     * @returns {Promise<Object>} Updated user
     */
    async addPermission(id, permission) {
        // First get current permissions
        const user = await this.findById(id, { select: { permissions: true } })
        const currentPerms = user.permissions || []

        // Only add if not already present
        if (!currentPerms.includes(permission)) {
            return this.updatePermissions(id, [...currentPerms, permission])
        }

        return user
    }

    /**
     * Remove a permission from a user
     * @param {BigInt} id - User ID
     * @param {string} permission - Permission to remove
     * @returns {Promise<Object>} Updated user
     */
    async removePermission(id, permission) {
        // First get current permissions
        const user = await this.findById(id, { select: { permissions: true } })
        const currentPerms = user.permissions || []

        // Remove the permission
        const updatedPerms = currentPerms.filter(p => p !== permission)

        // Only update if the permissions actually changed
        if (currentPerms.length !== updatedPerms.length) {
            return this.updatePermissions(id, updatedPerms)
        }

        return user
    }

    /**
     * Get users with pagination and filtering
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Paginated users with total count
     */
    async getUsers({ page = 1, limit = 20, role = null, search = null, orderBy = 'username', order = 'asc' } = {}) {
        const skip = (page - 1) * limit

        // Build where clause
        const where = {}
        if (role) {
            where.role = role
        }
        if (search) {
            where.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { displayName: { contains: search, mode: 'insensitive' } }
            ]
        }

        // Count total matching users
        const total = await this.prisma.user.count({ where })

        // Get the users for this page
        const users = await this.prisma.user.findMany({
            where,
            take: limit,
            skip,
            orderBy: { [orderBy]: order },
            select: {
                id: true,
                username: true,
                displayName: true,
                role: true,
                permissions: true,
                isBanned: true,
                createdAt: true,
                updatedAt: true
            }
        })

        return {
            users,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        }
    }

    /**
     * Create a new user
     * @param {Object} data - User data
     * @returns {Promise<Object>} Created user
     */
    async create(data) {
        return this.prisma.user.create({
            data,
            include: {
                profile: true,
                economy: true,
                level: true,
                statistics: true,
                achievements: true,
                tickets: true,
                conversations: true,
                knowledgeEntries: true,
                moderationReceived: true,
                moderationPerformed: true
            }
        })
    }

    /**
     * Update user fields
     * @param {BigInt|number|string} id
     * @param {Object} data
     * @returns {Promise<Object>} Updated user
     */
    async updateUser(id, data) {
        return this.prisma.user.update({
            where: { id: BigInt(id) },
            data,
            include: {
                profile: true,
                economy: true,
                level: true,
                statistics: true,
                achievements: true,
                tickets: true,
                conversations: true,
                knowledgeEntries: true,
                moderationReceived: true,
                moderationPerformed: true
            }
        })
    }

    /**
     * Delete a user
     * @param {BigInt|number|string} id
     * @returns {Promise<Object>} Deleted user
     */
    async deleteUser(id) {
        return this.prisma.user.delete({
            where: { id: BigInt(id) }
        })
    }

    /**
     * Get all users (with optional filters and relations)
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Users
     */
    async getAll(options = {}) {
        const { where = {}, include = {}, orderBy = { createdAt: 'desc' }, take = 100, skip = 0 } = options
        return this.prisma.user.findMany({ where, include, orderBy, take, skip })
    }

    /**
     * Find user by email
     * @param {string} email
     * @param {Object} include
     * @returns {Promise<Object|null>} User or null
     */
    async findByEmail(email, include = {}) {
        return this.prisma.user.findUnique({ where: { email }, include })
    }

    /**
     * Find all banned users
     * @returns {Promise<Array>} Banned users
     */
    async getBannedUsers() {
        return this.prisma.user.findMany({ where: { isBanned: true } })
    }

    /**
     * Find users by achievement
     * @param {number} achievementId
     * @returns {Promise<Array>} Users with the achievement
     */
    async findByAchievement(achievementId) {
        return this.prisma.user.findMany({
            where: {
                achievements: {
                    some: { id: achievementId }
                }
            },
            include: { achievements: true }
        })
    }

    /**
     * Get users created within a date range
     * @param {Date} start
     * @param {Date} end
     * @returns {Promise<Array>} Users
     */
    async getByCreationDate(start, end) {
        return this.prisma.user.findMany({
            where: {
                createdAt: {
                    gte: new Date(start),
                    lte: new Date(end)
                }
            }
        })
    }

    /**
     * Get user statistics (total, banned, active today)
     * @returns {Promise<Object>} Stats
     */
    async getStats() {
        const total = await this.prisma.user.count()
        const banned = await this.prisma.user.count({ where: { isBanned: true } })
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const activeToday = await this.prisma.user.count({ where: { updatedAt: { gte: today } } })
        return { total, banned, activeToday }
    }
}
