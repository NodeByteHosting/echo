export class ContextTool {
    constructor() {
        this.contextQuestions = new Map()
        this.userContext = new Map()
    }

    needsAdditionalContext(message, userId) {
        const contextualQueries = [
            {
                trigger: ['install', 'setup', 'configure'],
                contextNeeded: ['os', 'environment'],
                priority: ['os']
            },
            {
                trigger: ['error', 'not working', 'failed'],
                contextNeeded: ['environment', 'version', 'os'],
                priority: ['environment']
            },
            {
                trigger: ['run', 'execute', 'start'],
                contextNeeded: ['platform', 'environment', 'os'],
                priority: ['platform']
            },
            {
                trigger: ['deploy', 'publish'],
                contextNeeded: ['platform'],
                priority: ['platform']
            }
        ]

        const lowercaseMsg = message.toLowerCase()
        const matchedQuery = contextualQueries.find(query => query.trigger.some(t => lowercaseMsg.includes(t)))

        if (!matchedQuery) {
            return []
        }

        const userContextData = this.userContext.get(userId) || {}
        return matchedQuery.priority.concat(matchedQuery.contextNeeded).filter(ctx => !userContextData[ctx])
    }

    generateContextQuestion(missingContext) {
        const contextQuestions = {
            os: "Could you tell me which operating system you're using? (e.g., Windows 11, macOS, Linux)",
            environment: 'What development environment or tools are you using? (e.g., VS Code, Node.js version)',
            version: 'Which version of the software/package are you working with?',
            platform: 'Where are you planning to deploy or run this? (e.g., local machine, cloud service)'
        }

        return `${contextQuestions[missingContext]} (After you respond, I'll provide a complete answer based on this information)`
    }

    async saveUserContext(userId, contextType, value) {
        const existingContext = this.userContext.get(userId) || {}
        this.userContext.set(userId, {
            ...existingContext,
            [contextType]: value,
            lastUpdated: new Date()
        })
    }

    getUserContext(userId) {
        return this.userContext.get(userId) || {}
    }

    setPendingContext(userId, originalQuestion, contextType) {
        this.contextQuestions.set(userId, { originalQuestion, contextType })
    }

    getPendingContext(userId) {
        return this.contextQuestions.get(userId)
    }

    clearPendingContext(userId) {
        this.contextQuestions.delete(userId)
    }

    clearUserHistory(userId) {
        this.userContext.delete(userId)
        this.contextQuestions.delete(userId)
    }
}
