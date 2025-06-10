export const aiConfig = {
    // Model configuration
    model: 'gpt-4.1-nano',
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
        cacheTTL: 3600, // 1 hour in seconds
        prioritizeSpeed: true,
        smartTokenBudgeting: true,
        concurrentRequests: 3
    },

    // Prompt file paths
    promptPaths: {
        basePath: 'd://@nodebyte/echo/prompts',
        defaultPrompt: 'default',
        dmPrompt: 'dm',
        personaPrompt: 'persona',
        entityPrompt: 'entity_mentions',
        technicalPrompt: 'technical',
        knowledgePrompt: 'knowledge_synthesis',
        researchPrompt: 'research_synthesis',
        supportPrompt: 'technical_support',
        codePrompt: 'code_analysis',
        conversationPrompt: 'conversation'
    }
}
