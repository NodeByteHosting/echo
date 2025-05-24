import { BaseAgent } from './baseAgent.js'

export class TechnicalSupportAgent extends BaseAgent {
    async canHandle(message) {
        const techTerms = [
            // Error patterns
            'error',
            'broken',
            "doesn't work",
            'failed',
            'crash',
            'issue',
            'problem',
            // Setup patterns
            'install',
            'setup',
            'config',
            'configure',
            'setting up',
            // Help patterns
            'help',
            'how to',
            'how do i',
            'guide',
            'tutorial',
            // Update patterns
            'update',
            'upgrade',
            'migrate',
            // Debug patterns
            'debug',
            'troubleshoot',
            'fix',
            'solve',
            // Performance patterns
            'slow',
            'laggy',
            'optimize',
            'performance'
        ]
        return techTerms.some(term => message.toLowerCase().includes(term))
    }

    async process(message, userId, contextData) {
        // Search knowledge base first
        const kbResults = await this.tools.knowledgeBase.searchKnowledge(message)

        // If no KB results, try web search
        if (!kbResults.length) {
            const webResults = await this.tools.webSearch.search(message)
            if (webResults.length) {
                return this.formatTechnicalResponse(message, webResults, contextData)
            }
        }

        // Use KB results if available
        return this.formatTechnicalResponse(message, kbResults, contextData)
    }

    async formatTechnicalResponse(message, results, contextData) {
        let response = ''

        // Add context-specific header
        if (contextData?.os) {
            response += `For ${contextData.os}:\n\n`
        }

        // Format results
        results.forEach(result => {
            response += `**${result.title}**\n${result.content || result.snippet}\n\n`
        })

        // Add troubleshooting tips if it's an error
        if (message.toLowerCase().includes('error')) {
            response += '\n> 🦊 Quick Troubleshooting Tips:\n'
            response += '> • Check logs for detailed error messages\n'
            response += '> • Verify permissions and configurations\n'
            response += '> • Try restarting the service\n'
        }

        return response
    }
}
