import { BaseAgent } from './baseAgent.js'
import { PrismaClient, TicketStatus } from '@prisma/client'
import { log } from '../../functions/logger.js'

export class TechnicalSupportAgent extends BaseAgent {
    constructor(aiModel) {
        super()
        this.aiModel = aiModel
        this.prisma = new PrismaClient()
    }

    async canHandle(message) {
        const technicalIndicators = ['how to', 'error', 'problem', 'issue', 'not working', 'help', 'fix', 'debug']

        const msg = message.toLowerCase()
        return technicalIndicators.some(indicator => msg.includes(indicator))
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

    async process(message, userId, contextData = null) {
        try {
            // Check if we need additional context
            const neededContext = await this.needsAdditionalContext(message, contextData)
            if (neededContext) {
                return {
                    content: neededContext,
                    needsMoreContext: true
                }
            }

            // Create or update support ticket
            const ticket = await this.handleTicket(message, userId)

            // Check knowledge base first
            const knowledgeResponse = await this.aiModel.getResponse({
                message: `Check if this query needs knowledge base lookup: "${message}"
                Consider:
                1. Is it asking about documented features or processes?
                2. Is it a common issue or question?
                3. Would this be in a knowledge base or FAQ?
                
                Return true or false`,
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
                                ticketId: ticket.id,
                                ticketStatus: ticket.status
                            },
                            template: 'technical_support'
                        }
                    })
                }
            }

            // Add AI response to ticket
            await this.prisma.message.create({
                data: {
                    content: response,
                    ticketId: ticket.id,
                    senderId: userId,
                    isInternal: false
                }
            })

            return this.formatTechnicalResponse(message, response, ticket)
        } catch (error) {
            log('Error in TechnicalSupportAgent process:', 'error', error)
            throw error
        }
    }

    async handleTicket(message, userId) {
        try {
            // Check for existing open ticket
            const existingTicket = await this.prisma.ticket.findFirst({
                where: {
                    userId: BigInt(userId),
                    status: {
                        in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS]
                    }
                }
            })

            if (existingTicket) {
                // Add new message to existing ticket
                await this.prisma.message.create({
                    data: {
                        content: message,
                        ticketId: existingTicket.id,
                        senderId: BigInt(userId),
                        isInternal: false
                    }
                })
                return existingTicket
            }

            // Create new ticket if none exists
            const newTicket = await this.prisma.ticket.create({
                data: {
                    title: `Support Request: ${message.slice(0, 50)}...`,
                    description: message,
                    userId: BigInt(userId),
                    status: TicketStatus.OPEN,
                    messages: {
                        create: {
                            content: message,
                            senderId: BigInt(userId),
                            isInternal: false
                        }
                    }
                },
                include: {
                    messages: true,
                    user: true
                }
            })

            // Try to auto-assign to an available agent
            const availableAgent = await this.prisma.supportAgent.findFirst({
                where: {
                    isActive: true,
                    tickets: {
                        every: {
                            status: {
                                in: [TicketStatus.RESOLVED, TicketStatus.CLOSED]
                            }
                        }
                    }
                }
            })

            if (availableAgent) {
                return await this.prisma.ticket.update({
                    where: { id: newTicket.id },
                    data: {
                        status: TicketStatus.IN_PROGRESS,
                        assignedTo: availableAgent.id
                    }
                })
            }

            return newTicket
        } catch (error) {
            log('Error in handleTicket:', 'error', error)
            throw error
        }
    }

    async formatTechnicalResponse(message, response, ticket) {
        const isError = message.toLowerCase().includes('error')
        let formattedResponse = response

        if (isError) {
            formattedResponse += '\n\n> 🦊 Quick Troubleshooting Tips:\n'
            formattedResponse += '> • Check logs for detailed error messages\n'
            formattedResponse += '> • Verify permissions and configurations\n'
            formattedResponse += '> • Try restarting the service'
        }

        formattedResponse += `\n\n> 🎫 Ticket #${ticket.id} - Status: ${ticket.status}`
        if (ticket.assignedTo) {
            formattedResponse += '\n> An agent has been assigned to help you.'
        } else {
            formattedResponse += '\n> A support agent will be with you shortly.'
        }

        return {
            content: formattedResponse,
            type: 'technical_support',
            metadata: {
                ticketId: ticket.id,
                status: ticket.status,
                assignedTo: ticket.assignedTo
            }
        }
    }

    async searchKnowledgeBase(query) {
        try {
            // Search for relevant knowledge base entries
            const entries = await this.prisma.knowledgeBase.findMany({
                where: {
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { content: { contains: query, mode: 'insensitive' } },
                        { tags: { hasSome: query.toLowerCase().split(' ') } }
                    ],
                    isVerified: true
                },
                orderBy: {
                    useCount: 'desc'
                },
                take: 3
            })

            if (entries.length === 0) {
                return null
            }

            // Update usage count for found entries
            await Promise.all(
                entries.map(entry =>
                    this.prisma.knowledgeBase.update({
                        where: { id: entry.id },
                        data: { useCount: { increment: 1 } }
                    })
                )
            )

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
