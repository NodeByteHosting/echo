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

    async getNodeById(nodeId) {
        try {
            const response = await this.client.get(`/api/application/nodes/${nodeId}`)
            return response.data.data
        } catch (error) {
            console.error(`Error fetching node with ID ${nodeId}:`, error)
            throw error
        }
    }

    async getUsers() {
        try {
            const response = await this.client.get('/api/application/users')
            return response.data.data
        } catch (error) {
            console.error('Error fetching users:', error)
            throw error
        }
    }

    async getUserById(userId) {
        try {
            const response = await this.client.get(`/api/application/users/${userId}`)
            return response.data.data
        } catch (error) {
            console.error(`Error fetching user with ID ${userId}:`, error)
            throw error
        }
    }

    async createUser(userData) {
        try {
            const response = await this.client.post('/api/application/users', userData)
            return response.data.data
        } catch (error) {
            console.error('Error creating user:', error)
            throw error
        }
    }

    async updateUser(userId, userData) {
        try {
            const response = await this.client.patch(`/api/application/users/${userId}`, userData)
            return response.data.data
        } catch (error) {
            console.error(`Error updating user with ID ${userId}:`, error)
            throw error
        }
    }

    async deleteUser(userId) {
        try {
            await this.client.delete(`/api/application/users/${userId}`)
            return { success: true }
        } catch (error) {
            console.error(`Error deleting user with ID ${userId}:`, error)
            throw error
        }
    }

    async getServers() {
        try {
            const response = await this.client.get('/api/application/servers')
            return response.data.data
        } catch (error) {
            console.error('Error fetching servers:', error)
            throw error
        }
    }

    async getServerById(serverId) {
        try {
            const response = await this.client.get(`/api/application/servers/${serverId}`)
            return response.data.data
        } catch (error) {
            console.error(`Error fetching server with ID ${serverId}:`, error)
            throw error
        }
    }

    async createServer(serverData) {
        try {
            const response = await this.client.post('/api/application/servers', serverData)
            return response.data.data
        } catch (error) {
            console.error('Error creating server:', error)
            throw error
        }
    }

    async updateServer(serverId, serverData) {
        try {
            const response = await this.client.patch(`/api/application/servers/${serverId}`, serverData)
            return response.data.data
        } catch (error) {
            console.error(`Error updating server with ID ${serverId}:`, error)
            throw error
        }
    }

    async deleteServer(serverId) {
        try {
            await this.client.delete(`/api/application/servers/${serverId}`)
            return { success: true }
        } catch (error) {
            console.error(`Error deleting server with ID ${serverId}:`, error)
            throw error
        }
    }

    async suspendServer(serverId) {
        try {
            const response = await this.client.post(`/api/application/servers/${serverId}/suspend`)
            return response.data.data
        } catch (error) {
            console.error(`Error suspending server with ID ${serverId}:`, error)
            throw error
        }
    }

    async unsuspendServer(serverId) {
        try {
            const response = await this.client.post(`/api/application/servers/${serverId}/unsuspend`)
            return response.data.data
        } catch (error) {
            console.error(`Error unsuspending server with ID ${serverId}:`, error)
            throw error
        }
    }

    async reinstallServer(serverId) {
        try {
            const response = await this.client.post(`/api/application/servers/${serverId}/reinstall`)
            return response.data.data
        } catch (error) {
            console.error(`Error reinstalling server with ID ${serverId}:`, error)
            throw error
        }
    }
}
