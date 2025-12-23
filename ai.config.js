import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const aiConfig = {
    // Model configuration
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 1500,

    // Default system prompt - only used as fallback if prompt service fails
    systemPrompt: "You are Echo, NodeByte's fox assistant. Be helpful, technical, and a bit sarcastic.",

    // Short system prompt for lightweight contexts
    shortSystemPrompt: "You're Echo, NodeByte's snarky fox assistant. Be helpful, technical, and a bit sarcastic.",

    // Technical prompt for focused technical responses
    technicalPrompt: "You're Echo, NodeByte's technical assistant. Focus on accuracy for technical topics.",

    // Performance optimization settings
    optimization: {
        cacheEnabled: true,
        cacheTTL: 3600,
        prioritizeSpeed: true,
        smartTokenBudgeting: true,
        concurrentRequests: 3
    },

    // Prompt file paths
    promptPaths: {
        basePath: process.env.PROMPT_PATH || join(__dirname, '../echo-ai/prompts'),
        corePrompt: 'core',
        conversationPrompt: 'conversation',
        technicalPrompt: 'technical',
        synthesisPrompt: 'synthesis'
    }
}
