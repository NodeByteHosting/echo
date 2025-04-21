import axios from 'axios'

export class GithubClient {
    static instance = null

    constructor(token) {
        if (!GithubClient.instance) {
            GithubClient.instance = axios.create({
                baseURL: 'https://api.github.com',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            })
        }
    }

    static init(token) {
        if (!GithubClient.instance) {
            GithubClient.instance = new GithubClient(token)
        }
    }

    async getKBFileContent(owner, repo, path) {
        try {
            const response = await this.client.get(`/repos/${owner}/${repo}/contents/${path}`)
            return response.data
        } catch (error) {
            console.error(`Error fetching file content from ${owner}/${repo}/${path}:`, error)
            throw error
        }
    }

    async getKBJsonFileContent(owner, repo, path) {
        try {
            const content = await this.getKBFileContent(owner, repo, path)
            return JSON.parse(content)
        } catch (error) {
            console.error(`Error fetching JSON file content from ${owner}/${repo}/${path}:`, error)
            throw error
        }
    }
}
