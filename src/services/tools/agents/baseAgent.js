export class BaseAgent {
    constructor(tools) {
        this.tools = tools
    }

    async canHandle(message) {
        return false // Override in subclasses
    }

    async process(message, userId, contextData) {
        throw new Error('Not implemented')
    }

    async validateResult(result) {
        return true // Override in subclasses if needed
    }
}
