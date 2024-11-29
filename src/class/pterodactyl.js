import axios from 'axios'

export class PterodactylClient {
    constructor(apiUrl, apiKey) {
        this.apiUrl = apiUrl
        this.apiKey = apiKey
        this.client = axios.create({
            baseURL: apiUrl,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
    }

    async getNodes() {
        try {
            const response = await this.client.get('/api/application/nodes')
            return response.data.data
        } catch (error) {
            console.error('Error fetching nodes:', error)
            throw error
        }
    }
}
