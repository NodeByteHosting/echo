import { BaseAgent } from './baseAgent.js'
import axios from 'axios'
import { log } from '../../functions/logger.js'
import { db } from '../../database/client.js'
import { makeSerializable } from '../../utils/serialization.js'

export class ResearchAgent extends BaseAgent {
    constructor(aiModel) {
        super()
        this.aiModel = aiModel
        this.apiUrl = 'https://api.tavily.com/search'
        this.apiKey = process.env.TAVILY_API_KEY
        this.database = db.getInstance()

        if (!this.apiKey) {
            log('TAVILY_API_KEY is not configured', 'error')
            throw new Error('TAVILY_API_KEY is not configured')
        }

        // Cache for recent research results
        this.researchCache = new Map()
        this.cacheConfig = {
            maxSize: 100,
            ttl: 60 * 60 * 1000 // 1 hour
        }
    }

    async canHandle(message) {
        // Check if this is explicitly a research request
        const researchIndicators = [
            'research',
            'search for',
            'look up',
            'find information',
            'latest news',
            'recent events',
            'current status'
        ]

        const msg = message.toLowerCase()

        // Direct research request indicators
        for (const indicator of researchIndicators) {
            if (msg.includes(indicator)) {
                return true
            }
        }

        // For more complex research queries, use AI to determine
        if (message.length > 15 && message.includes('?')) {
            const response = await this.aiModel.getResponse(
                'Determine if this query requires external research:\n' +
                    'Message: "' +
                    message +
                    '"\n\n' +
                    'Consider:\n' +
                    '1. Does it ask about facts, statistics, or information not in training data?\n' +
                    '2. Does it reference recent events or current status?\n' +
                    '3. Does it explicitly ask for research?\n' +
                    '4. Would web search or external sources help answer this?\n\n' +
                    'Return ONLY: "research" or "no-research"'
            )

            return response.toLowerCase().includes('research')
        }

        return false
    }

    async process(query, userId, contextData = {}) {
        try {
            // Check if we have cached results for similar queries
            const cacheKey = this._generateCacheKey(query)
            const cachedResults = this._getCachedResults(cacheKey)

            if (cachedResults) {
                log('Using cached research results', 'info')

                // If this is a direct research request, enhance presentation
                if (contextData.isDirectResearch) {
                    return this._formatDirectResearchResponse(query, cachedResults)
                }

                return cachedResults
            }

            // Extract search parameters
            const { searchDepth, includeImages } = this._parseSearchParameters(query, contextData)

            // Optimize query for search if needed
            const optimizedQuery = await this._optimizeSearchQuery(query)

            // Perform the search
            const searchResults = await this._search(optimizedQuery, contextData.limit || 3, searchDepth, includeImages)

            if (searchResults.length === 0) {
                return {
                    content:
                        "I couldn't find any relevant information for your query. This might be due to:\n" +
                        '1. Very specific or technical topic\n' +
                        '2. Recent events not yet indexed\n' +
                        '3. Network or service availability issues\n\n' +
                        'Could you try rephrasing your question or providing more context?',
                    error: 'NO_RESULTS',
                    retry: true,
                    searchQuery: query
                }
            }

            try {
                // Log the research for analytics
                this._logResearch(userId, query, searchResults.length).catch(err => {
                    console.error('Failed to log research:', err)
                })

                // Create a safe copy of search results for AI processing
                const safeSearchResults = makeSerializable(searchResults)

                // Use AI to analyze and synthesize the results
                const analysis = await this.aiModel.getResponse({
                    message: optimizedQuery,
                    context: {
                        searchResults: safeSearchResults,
                        template: 'research_synthesis',
                        directResearch: contextData.isDirectResearch
                    }
                })

                const result = {
                    content: analysis,
                    sourceResults: makeSerializable(searchResults),
                    searchMetadata: {
                        resultCount: searchResults.length,
                        averageConfidence: this._calculateAverageConfidence(searchResults),
                        timestamp: new Date().toISOString(),
                        query: optimizedQuery
                    },
                    searchQuery: optimizedQuery
                }

                // Cache the results - make sure we store a safe copy
                this._cacheResults(cacheKey, makeSerializable(result))

                // If this is a direct research request, enhance presentation
                if (contextData.isDirectResearch) {
                    return this._formatDirectResearchResponse(query, result)
                }

                return result
            } catch (aiError) {
                // If AI synthesis fails, return raw results with a fallback summary
                log('AI synthesis error', 'warn', { error: aiError.message })
                const fallbackResponse = {
                    content: this._generateFallbackSummary(searchResults),
                    sourceResults: makeSerializable(searchResults),
                    error: 'AI_SYNTHESIS_FAILED',
                    fallback: true,
                    searchQuery: optimizedQuery
                }

                // Still cache fallback results - make sure we store a safe copy
                this._cacheResults(cacheKey, makeSerializable(fallbackResponse))

                return fallbackResponse
            }
        } catch (error) {
            log('Research error', 'error', {
                error: error.message,
                query,
                stack: error.stack
            })

            // Return user-friendly error messages
            const errorMessages = {
                'Invalid API key': 'There is a configuration issue with the research service. Please contact support.',
                'Rate limit exceeded': 'The research service is temporarily busy. Please try again in a few minutes.',
                'Search request timed out': 'The research request took too long to complete. Please try again.',
                'Network connectivity issue':
                    'There are connection issues with the research service. Please try again later.',
                'Max retry attempts reached':
                    'The research service is experiencing difficulties. Please try again later.',
                'ECONNABORTED': 'The connection to the research service timed out. Please try again.'
            }

            return {
                content: errorMessages[error.message] || 'An unexpected error occurred while researching your query.',
                error: error.message,
                retry: !['Invalid API key'].includes(error.message),
                searchQuery: query
            }
        }
    }

    /**
     * Format a direct research response with enhanced presentation
     * @private
     */
    _formatDirectResearchResponse(query, results) {
        // For direct research requests, enhance the presentation
        let enhancedContent = '## Research Results for: "' + query + '"\n\n'

        // Add the main content
        enhancedContent += results.content

        // Add sources section if available
        if (results.sourceResults && results.sourceResults.length > 0) {
            enhancedContent += '\n\n## Sources\n\n'

            results.sourceResults.forEach((source, index) => {
                enhancedContent += index + 1 + '. [' + source.title + '](' + source.link + ') \n'
            })
        }

        // Add metadata
        if (results.searchMetadata) {
            enhancedContent +=
                '\n\n > * Research conducted at ' +
                results.searchMetadata.timestamp +
                ' with ' +
                results.searchMetadata.resultCount +
                ' sources.* '
        }

        return {
            ...results,
            content: enhancedContent,
            isDirectResearch: true
        }
    }

    /**
     * Generate a cache key for research results
     * @private
     */
    _generateCacheKey(query) {
        // Normalize the query
        const normalized = query
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')

        return 'research:' + normalized.substring(0, 100)
    }

    /**
     * Get cached research results
     * @private
     */
    _getCachedResults(key) {
        const cached = this.researchCache.get(key)
        if (!cached) {
            return null
        }

        // Check if cache entry is still valid
        if (Date.now() - cached.timestamp > this.cacheConfig.ttl) {
            this.researchCache.delete(key)
            return null
        }

        return cached.results
    }

    /**
     * Cache research results
     * @private
     */
    _cacheResults(key, results) {
        // Enforce cache size limit
        if (this.researchCache.size >= this.cacheConfig.maxSize) {
            // Remove oldest entry
            const oldestKey = [...this.researchCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0]
            this.researchCache.delete(oldestKey)
        }

        this.researchCache.set(key, {
            results,
            timestamp: Date.now()
        })
    }

    /**
     * Optimize a search query for better results
     * @private
     */
    async _optimizeSearchQuery(query) {
        // For very short queries, use as-is
        if (query.length < 15) {
            return query
        }

        // For complex queries, use AI to optimize
        try {
            const optimized = await this.aiModel.getResponse(
                'Optimize this search query for external research: "' +
                    query +
                    '"\n\n' +
                    'Create a concise, focused search query that will yield the most relevant results.\n' +
                    'Return ONLY the optimized query with no explanation.'
            )

            return optimized.length > 10 ? optimized : query
        } catch (error) {
            log('Query optimization failed, using original', 'warn')
            return query
        }
    }

    /**
     * Parse search parameters from query and context
     * @private
     */
    _parseSearchParameters(query, contextData) {
        let searchDepth = 'advanced'
        let includeImages = false

        // Check query for explicit parameters
        if (query.includes('detailed research') || query.includes('in-depth')) {
            searchDepth = 'comprehensive'
        }

        if (query.includes('images') || query.includes('pictures') || query.includes('photos')) {
            includeImages = true
        }

        // Override with context data if available
        if (contextData.searchDepth) {
            searchDepth = contextData.searchDepth
        }

        if (contextData.includeImages !== undefined) {
            includeImages = contextData.includeImages
        }

        return { searchDepth, includeImages }
    }

    /**
     * Log research for analytics
     * @private
     */
    async _logResearch(userId, query, resultCount) {
        try {
            // If available, log to database for analytics
            if (this.database && this.database.conversations) {
                await this.database.conversations.addEntry(
                    userId,
                    '[Research] Query: ' + query + ' (' + resultCount + ' results)',
                    false
                )
            }
        } catch (error) {
            // Non-critical, just log the error
            log('Failed to log research for analytics', 'warn', error)
        }
    }

    async _search(query, limit) {
        try {
            // Validate input
            if (!query?.trim()) {
                throw new Error('Search query cannot be empty')
            }

            // Add retry logic with exponential backoff
            let attempt = 0
            const maxAttempts = 3
            const baseDelay = 1000 // 1 second

            while (attempt < maxAttempts) {
                try {
                    const response = await axios.post(
                        this.apiUrl,
                        {
                            api_key: this.apiKey,
                            query: query,
                            search_depth: 'advanced',
                            max_results: limit,
                            include_answer: true,
                            include_raw_content: false,
                            include_images: false,
                            include_summary: true
                        },
                        {
                            timeout: 10000, // 10 second timeout
                            headers: {
                                'Content-Type': 'application/json',
                                'User-Agent': 'Echo-Bot/1.0'
                            }
                        }
                    )

                    // Validate response structure
                    if (!response.data) {
                        throw new Error('Invalid response from Tavily API')
                    }

                    if (!Array.isArray(response.data?.results)) {
                        throw new Error('Invalid results format from Tavily API')
                    }

                    return response.data.results
                        .map(result => {
                            // Validate each result object
                            if (!result.title || !result.url || !result.content) {
                                log('Incomplete result from Tavily API', 'warn', { result })
                                return null
                            }

                            return {
                                title: result.title,
                                link: result.url,
                                snippet: result.content,
                                source: 'Tavily Search',
                                confidence: result.score || null
                            }
                        })
                        .filter(Boolean) // Remove any null results
                } catch (apiError) {
                    attempt++

                    if (apiError.response) {
                        // Handle specific HTTP errors
                        switch (apiError.response.status) {
                            case 401:
                                throw new Error('Invalid API key')
                            case 429:
                                if (attempt === maxAttempts) {
                                    throw new Error('Rate limit exceeded')
                                }
                                break
                            case 500:
                                if (attempt === maxAttempts) {
                                    throw new Error('Tavily API service error')
                                }
                                break
                            default:
                                if (attempt === maxAttempts) {
                                    throw apiError
                                }
                        }
                    } else if (apiError.code === 'ECONNABORTED') {
                        if (attempt === maxAttempts) {
                            throw new Error('Search request timed out')
                        }
                    } else if (!apiError.response) {
                        if (attempt === maxAttempts) {
                            throw new Error('Network connectivity issue')
                        }
                    }

                    // Exponential backoff
                    const delay = baseDelay * Math.pow(2, attempt)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }
            }

            throw new Error('Max retry attempts reached')
        } catch (error) {
            log('Tavily search error', 'error', {
                error: error.message,
                query,
                stack: error.stack
            })
            throw error // Let the process method handle the error
        }
    }

    _formatSourceResults(results) {
        if (!results.length) {
            return 'No research results available.'
        }

        return results
            .map(result => '**' + result.title + '**\n' + result.snippet + '\n' + '[Read more](' + result.link + ')')
            .join('\n\n')
    }

    _generateFallbackSummary(results) {
        let summary = 'Here are the key findings from the research:\n\n'

        results.forEach((result, index) => {
            summary += index + 1 + '. ' + result.title + '\n'
            if (result.snippet) {
                summary +=
                    '   - ' + result.snippet.substring(0, 200) + (result.snippet.length > 200 ? '...' : '') + '\n'
            }
        })

        summary += '\nFor more detailed information, please refer to the original sources.'

        return summary
    }

    _calculateAverageConfidence(results) {
        const scores = results.map(r => r.confidence).filter(score => typeof score === 'number')

        if (scores.length === 0) {
            return null
        }

        return scores.reduce((a, b) => a + b, 0) / scores.length
    }

    /**
     * Create a safe, serializable version of an object
     * Prevents circular reference errors when passing to AI model
     * @param {Object} obj - The object to make serializable
     * @returns {Object} A safe, serializable copy
     */
    _makeSafeForSerialization(obj) {
        if (!obj) {
            return obj
        }

        const seen = new WeakSet()

        const sanitize = item => {
            // Handle primitives
            if (item === null || item === undefined) {
                return item
            }
            if (typeof item !== 'object') {
                return item
            }

            // Handle circular references
            if (seen.has(item)) {
                return '[Circular Reference]'
            }
            seen.add(item)

            // Handle arrays
            if (Array.isArray(item)) {
                return item.map(val => sanitize(val))
            }

            // Handle dates
            if (item instanceof Date) {
                return item.toISOString()
            }

            // Handle buffers and typed arrays
            if (Buffer.isBuffer(item) || item instanceof Uint8Array) {
                return '[Binary Data]'
            }

            // Handle error objects
            if (item instanceof Error) {
                return {
                    name: item.name,
                    message: item.message,
                    stack: item.stack
                }
            }

            // Handle regular objects
            const result = {}

            for (const [key, value] of Object.entries(item)) {
                // Skip functions, symbols, and other non-serializable properties
                if (typeof value === 'function' || typeof value === 'symbol') {
                    continue
                }

                try {
                    // Try to safely serialize the value
                    result[key] = sanitize(value)
                } catch (error) {
                    // If serialization fails, provide a safe fallback
                    result[key] = `[Unserializable: ${typeof value}]`
                }
            }

            return result
        }

        return sanitize(obj)
    }
}
