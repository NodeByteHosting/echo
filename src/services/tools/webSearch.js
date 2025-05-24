import axios from 'axios'
import { log } from '../../functions/logger.js'

export class WebSearchTool {
    constructor() {
        this.apiUrl = 'https://api.tavily.com/search'
        this.apiKey = process.env.TAVILY_API_KEY
        if (!this.apiKey) {
            log('TAVILY_API_KEY is not configured', 'error')
            throw new Error('TAVILY_API_KEY is not configured')
        }
    }

    async search(query, limit = 3) {
        try {
            const response = await axios.post(this.apiUrl, {
                api_key: this.apiKey,
                query: query,
                search_depth: 'advanced',
                max_results: limit,
                include_domains: [],
                exclude_domains: [],
                include_answer: true,
                include_raw_content: false,
                include_images: false,
                include_summary: true
            })

            if (!response.data?.results) {
                return []
            }

            return response.data.results.map(result => ({
                title: result.title,
                link: result.url,
                snippet: result.content,
                source: 'Tavily Search'
            }))
        } catch (error) {
            log(`Tavily search error: ${error.message}`, 'error')
            return []
        }
    }

    formatResults(results) {
        if (!results.length) {
            return 'No search results found.'
        }

        return results.map(result => `**${result.title}**\n${result.snippet}\n[Read more](${result.link})`).join('\n\n')
    }
}
