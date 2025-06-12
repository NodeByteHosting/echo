import { log } from '../functions/logger.js'
import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import { UserModule } from './modules/users.js'
import { TicketModule } from './modules/tickets.js'
import { AgentModule } from './modules/agents.js'
import { KnowledgeModule } from './modules/knowledge.js'
import { ConversationModule } from './modules/conversations.js'
import { ModerationModule } from './modules/moderation.js'
import { AuditModule } from './modules/audit.js'
import { GuildModule } from './modules/guild.js'
import EchoBot from '../class/client.js'
import { AchievementModule } from './modules/achievement.js'
import { BadgeModule } from './modules/badge.js'
import { InventoryModule } from './modules/inventory.js'
import { ItemModule } from './modules/item.js'
import { LevelModule } from './modules/level.js'
import { StatisticsModule } from './modules/statistics.js'
import { TransactionModule } from './modules/transaction.js'
import { TicketFeedbackModule } from './modules/ticketFeedback.js'
import { EchoModule } from './modules/echo.js'

const prisma = new PrismaClient().$extends(withAccelerate())

/**
 * Create a singleton instance of prisma that can be used throughout the application.
 * This class also contains a few helper functions to log messages to the console.
 */
export class db {
    static instance

    constructor() {
        if (db.instance) {
            return db.instance
        }

        this.prisma = prisma
        this.bot = EchoBot

        // Initialize modules
        this.users = new UserModule(this.prisma)
        this.tickets = new TicketModule(this.prisma)
        this.agents = new AgentModule(this.prisma)
        this.knowledge = new KnowledgeModule(this.prisma)
        this.conversations = new ConversationModule(this.prisma)
        this.moderation = new ModerationModule(this.prisma)
        this.audit = new AuditModule(this.prisma)
        this.guild = new GuildModule(this.prisma)
        this.achievement = new AchievementModule(this.prisma)
        this.badge = new BadgeModule(this.prisma)
        this.inventory = new InventoryModule(this.prisma)
        this.item = new ItemModule(this.prisma)
        this.level = new LevelModule(this.prisma)
        this.statistics = new StatisticsModule(this.prisma)
        this.transaction = new TransactionModule(this.prisma)
        this.ticketFeedback = new TicketFeedbackModule(this.prisma)
        this.echo = new EchoModule(this.prisma)

        this.logs = {
            info: msg => log(msg, 'info'),
            error: msg => log(msg, 'error'),
            err: msg => log(msg, 'error'),
            debug: msg => log(msg, 'debug'),
            warn: msg => log(msg, 'warn'),
            done: msg => log(msg, 'done')
        }

        db.instance = this
    }

    async connect() {
        try {
            await this.prisma.$queryRaw`SELECT 1`
            this.logs.info('database connection is active')
            return true
        } catch (error) {
            this.logs.error('Failed to connect to the database.')
            return false
        }
    }

    async disconnect() {
        await this.prisma.$disconnect()
        this.logs.info('database connection has been closed')
    }

    static getInstance() {
        if (!db.instance) {
            db.instance = new db()
        }
        return db.instance
    }
}
