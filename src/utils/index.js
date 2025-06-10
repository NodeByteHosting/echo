/**
 * Centralized exports for shared utility functions
 */

// Export cache utilities
export { CacheManager, responseCache, knowledgeCache, researchCache, globalCache, createCache } from './cacheManager.js'

// Export JSON utilities
export { safeJsonParse, extractJsonFromText, makeSerializable, safeStringify } from './jsonUtils.js'

// Export error handling utilities
export { ErrorType, createErrorResponse, handleProcessingError, withTimeout } from './errorHandler.js'

// Export prompt utilities
export {
    loadPromptTemplate,
    buildPrompt,
    createContextPrompt,
    enhancePromptWithContext,
    definePromptCategories,
    createDynamicPrompt
} from './dynamicPromptBuilder.js'

// Other utility exports
export { default as logger } from '../functions/logger.js'
export { default as memoize } from './performanceOptimizer.js'
