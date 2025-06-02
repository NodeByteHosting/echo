import { BaseAgent } from './baseAgent.js'
import { log } from '../../functions/logger.js'
import { db } from '../../database/client.js'

export class TechnicalSupportAgent extends BaseAgent {
    constructor(aiModel) {
        super()
        this.aiModel = aiModel
        this.database = db.getInstance()
        this.ticketAgent = null // Will be set by AI service

        // Improved technical indicators with relevance weights
        this.technicalIndicators = {
            // High priority support terms (likely need ticket creation)
            high: ['broken', 'error', 'issue', 'problem', 'not working', 'fail', 'crash', 'bug', 'ticket', 'support'],
            // Medium priority terms (may need ticket creation)
            medium: [
                'help me fix',
                'troubleshoot',
                'diagnose',
                'resolve',
                "doesn't work",
                "isn't working",
                "won't start"
            ],
            // Low priority terms (likely just knowledge/conversation)
            low: ['how to', 'how do i', 'guide', 'tutorial', 'instructions', 'explain', 'understanding', 'learn']
        }
    }

    /**
     * Set the ticket agent reference
     * @param {TicketAgent} agent - The ticket agent instance
     */
    setTicketAgent(agent) {
        this.ticketAgent = agent
    }

    async canHandle(message) {
        // First, do a quick check using indicator words
        const msg = message.toLowerCase()

        // Check if this is clearly a support request needing a ticket
        const isHighPriority = this.technicalIndicators.high.some(term => msg.includes(term))

        // Check if this is a medium priority request
        const isMediumPriority = this.technicalIndicators.medium.some(term => msg.includes(term))

        // Check if this is likely just a knowledge request
        const isLowPriority = this.technicalIndicators.low.some(term => msg.includes(term))

        // Explicit ticket requests should be handled by TicketAgent
        if (msg.includes('ticket') || msg.includes('open ticket') || msg.includes('create ticket')) {
            return false
        }

        // If it's high priority or (medium priority without low priority indicators)
        // we can handle it as a support request
        if (isHighPriority || (isMediumPriority && !isLowPriority)) {
            return true
        }

        // For ambiguous cases, use AI to determine
        if (isMediumPriority || isLowPriority) {
            // Ask AI if this requires technical support
            const response = await this.aiModel
                .getResponse(`Determine if this message requires technical support or just knowledge sharing:
Message: "${message}"

Consider:
1. Is the user reporting a specific technical problem?
2. Are they describing something broken or not working?
3. Do they explicitly ask for support or help fixing something?
4. Is this just a request for information or explanation?

Return ONLY: "support" if they need technical support, or "knowledge" if they just need information.`)

            return response.toLowerCase().includes('support')
        }

        return false
    }

    async needsAdditionalContext(message, contextData) {
        if (contextData?.os) {
            return null
        }

        const needsOsContext = ['install', 'setup', 'environment', 'path', 'command', 'terminal'].some(term =>
            message.toLowerCase().includes(term)
        )

        if (needsOsContext) {
            return "To help you better, I need to know what operating system you're using. Could you please specify if you're on Windows, macOS, or Linux?"
        }

        return null
    }

    async process(message, userId, contextData) {
        try {
            // Check if we need additional context
            const neededContext = await this.needsAdditionalContext(message, contextData)
            if (neededContext) {
                return {
                    content: neededContext,
                    needsMoreContext: true
                }
            }

            // Determine if this needs a ticket
            const needsTicket = await this._needsTicketCreation(message)

            let ticket = null
            let ticketResponse = null

            // Only create/update ticket if truly needed and ticket agent is available
            if (needsTicket && this.ticketAgent) {
                // Check for existing ticket first
                ticket = await this.ticketAgent.checkExistingTicket(userId)

                if (!ticket) {
                    // Let the ticket agent handle ticket creation
                    const analysis = {
                        priority: this._assessSeverity(message),
                        category: 'technical',
                        summary: `Technical Support: ${message.slice(0, 50)}...`,
                        requiredInfo: [],
                        possibleSolutions: []
                    }

                    ticket = await this.ticketAgent.createTicketOnBehalf(message, userId, analysis)
                    ticketResponse = `\n\n> 🎫 I've created a support ticket (#${ticket.id}) for this issue.`
                } else {
                    // Add message to existing ticket
                    await this.ticketAgent.addMessageToTicket(ticket.id, userId, message)
                    ticketResponse = `\n\n> 🎫 I've added this to your existing support ticket (#${ticket.id}).`
                }
            }

            // Check knowledge base first
            const knowledgeResponse = await this.aiModel.getResponse({
                message: `Check if this query needs knowledge base lookup: "${message}"
                Consider:
                1. Is it asking about documented features or processes?
                2. Is it a common issue or question?
                3. Would this be in a knowledge base or FAQ?
                
                Return: true or false`,
                context: { template: 'knowledge_check' }
            })

            let response
            if (knowledgeResponse.toLowerCase().includes('true')) {
                response = await this.searchKnowledgeBase(message)
            }

            // If no knowledge base answer or needs more specific help
            if (!response) {
                // Check if research is needed
                const needsResearch = await this.aiModel.getResponse({
                    message: `Check if this technical support query needs external research: "${message}"
                    Consider:
                    1. Is it a complex technical issue?
                    2. Does it involve specific error messages or codes?
                    3. Would external documentation or resources help?
                    4. Is it not covered by our standard knowledge base?
                    
                    Return true or false`,
                    context: { template: 'research_check' }
                })

                if (needsResearch.toLowerCase().includes('true')) {
                    response = await this.performResearch(message)
                } else {
                    // Generate standard AI response if no research needed
                    response = await this.aiModel.getResponse({
                        message,
                        context: {
                            userContext: {
                                ...contextData,
                                ticketId: ticket?.id,
                                ticketStatus: ticket?.status
                            },
                            template: 'technical_support'
                        }
                    })
                }
            }

            // Add ticket info to response if a ticket was created
            if (ticketResponse && response) {
                response += ticketResponse
            }

            return {
                content: response,
                type: 'technical_support',
                metadata: ticket
                    ? {
                          ticketId: ticket.id,
                          status: ticket.status,
                          assignedTo: ticket.assignedTo
                      }
                    : null
            }
        } catch (error) {
            log('Error in TechnicalSupportAgent process:', 'error', error)
            throw error
        }
    }

    /**
     * Determine if a message needs ticket creation
     */
    async _needsTicketCreation(message) {
        const msg = message.toLowerCase()

        // Auto-create ticket if user explicitly mentions ticket
        if (msg.includes('ticket') || msg.includes('create ticket') || msg.includes('open ticket')) {
            return true
        }

        // Check if message has high severity indicators
        const severity = this._assessSeverity(message)
        if (severity >= 4) {
            return true
        }

        // For medium severity, ask AI
        if (severity >= 2) {
            const response = await this.aiModel
                .getResponse(`Determine if this technical issue requires creating a support ticket:
Message: "${message}"

Consider:
1. Is this a critical error or problem?
2. Does this appear to be a system failure?
3. Is the user unable to use a service?
4. Does this require staff intervention?
5. Could this be answered with documentation?

Return ONLY: "ticket" if a support ticket should be created, or "no-ticket" if it's just a general question.`)

            return response.toLowerCase().includes('ticket')
        }

        return false
    }

    /**
     * Assess the severity of a support request
     */
    _assessSeverity(message) {
        const msg = message.toLowerCase()
        let score = 0

        // Critical terms
        const criticalTerms = ['urgent', 'critical', 'emergency', 'broken', 'crashed', 'down', 'not working at all']
        for (const term of criticalTerms) {
            if (msg.includes(term)) {
                score += 2
            }
        }

        // Error indicators
        const errorTerms = ['error', 'exception', 'fail', 'failed', 'bug', 'issue']
        for (const term of errorTerms) {
            if (msg.includes(term)) {
                score += 1
            }
        }

        // Reduce score for knowledge-seeking patterns
        const knowledgeTerms = ['how to', 'how do i', 'what is', 'explain', 'understand']
        for (const term of knowledgeTerms) {
            if (msg.includes(term)) {
                score -= 1
            }
        }

        return Math.max(0, Math.min(5, score))
    }

    async searchKnowledgeBase(query) {
        try {
            // Use knowledge module instead of direct Prisma queries
            const entries = await this.database.knowledge.search(query, {
                verified: true,
                limit: 3
            })

            if (entries.length === 0) {
                return null
            }

            // Update usage count for found entries
            await Promise.all(entries.map(entry => this.database.knowledge.incrementUseCount(entry.id)))

            // Format knowledge base response
            const response = [
                'I found some relevant information in our knowledge base:',
                '',
                ...entries.map(entry => [`## ${entry.title}`, entry.content, '']).flat()
            ].join('\n')

            return response
        } catch (error) {
            log('Error searching knowledge base:', 'error', error)
            return null
        }
    }

    async performResearch(query) {
        try {
            // Call research agent through AI model
            const researchResponse = await this.aiModel.getResponse({
                message: `Research query: "${query}"`,
                context: {
                    template: 'research',
                    searchDepth: 'technical',
                    includeSources: true
                }
            })

            if (!researchResponse) {
                return null
            }

            // Save research results to knowledge base if useful
            const shouldSave = await this.aiModel.getResponse({
                message: `Should this research be saved to knowledge base? Consider:
                1. Is it a common issue?
                2. Is the solution reusable?
                3. Would other users benefit?
                Research: "${researchResponse}"
                
                Return true or false with one sentence explanation.`,
                context: { template: 'knowledge_save_check' }
            })

            if (shouldSave.toLowerCase().includes('true')) {
                const title = `${query.slice(0, 100)}...`
                await this.prisma.knowledgeBase.create({
                    data: {
                        title,
                        content: researchResponse,
                        category: 'technical_support',
                        tags: query.toLowerCase().split(' '),
                        createdBy: BigInt(1), // System user ID
                        isVerified: true
                    }
                })
            }

            return researchResponse
        } catch (error) {
            log('Error performing research:', 'error', error)
            return null
        }
    }
}
