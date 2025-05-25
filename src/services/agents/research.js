import { BaseAgent } from './baseAgent.js'
import axios from 'axios'
import { log } from '../../functions/logger.js'

export class ResearchAgent extends BaseAgent {
    constructor(aiModel) {
        super()
        this.aiModel = aiModel
        this.apiUrl = 'https://api.tavily.com/search'
        this.apiKey = process.env.TAVILY_API_KEY

        if (!this.apiKey) {
            log('TAVILY_API_KEY is not configured', 'error')
            throw new Error('TAVILY_API_KEY is not configured')
        }
    }
    async process(query, limit = 3) {
        try {
            const searchResults = await this._search(query, limit)

            if (searchResults.length === 0) {
                return {
                    content:
                        "I couldn't find any relevant information for your query. This might be due to:\n" +
                        '1. Very specific or technical topic\n' +
                        '2. Recent events not yet indexed\n' +
                        '3. Network or service availability issues\n\n' +
                        'Could you try rephrasing your question or providing more context?',
                    error: 'NO_RESULTS',
                    retry: true
                }
            }

            try {
                // Use AI to analyze and synthesize the results
                const analysis = await this.aiModel.getResponse({
                    message: query,
                    context: {
                        searchResults,
                        template: 'research_synthesis'
                    }
                })

                return {
                    content: analysis,
                    sourceResults: searchResults,
                    searchMetadata: {
                        resultCount: searchResults.length,
                        averageConfidence: this._calculateAverageConfidence(searchResults),
                        timestamp: new Date().toISOString()
                    }
                }
            } catch (aiError) {
                // If AI synthesis fails, return raw results with a fallback summary
                log('AI synthesis error', 'warn', { error: aiError.message })
                return {
                    content: this._generateFallbackSummary(searchResults),
                    sourceResults: searchResults,
                    error: 'AI_SYNTHESIS_FAILED',
                    fallback: true
                }
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
                retry: !['Invalid API key'].includes(error.message)
            }
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

        return results.map(result => `**${result.title}**\n${result.snippet}\n[Read more](${result.link})`).join('\n\n')
    }

    _generateFallbackSummary(results) {
        let summary = 'Here are the key findings from the research:\n\n'

        results.forEach((result, index) => {
            summary += `${index + 1}. ${result.title}\n`
            if (result.snippet) {
                summary += `   ${result.snippet.slice(0, 200)}...\n`
            }
            summary += `   [Source](${result.link})\n\n`
        })

        return summary
    }

    _calculateAverageConfidence(results) {
        const scores = results.map(r => r.confidence).filter(score => typeof score === 'number')

        if (scores.length === 0) {
            return null
        }

        return scores.reduce((a, b) => a + b, 0) / scores.length
    }
}
