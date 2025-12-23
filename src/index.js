import dotenv from 'dotenv'
import Indexie from '@classes/client'

dotenv.config()

// Validate required environment variables
const requiredEnvVars = ['TOKEN', 'CLIENT_ID', 'DATABASE_URL']
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '))
    console.error('Please check your .env file or environment configuration')
    process.exit(1)
}

const client = new Indexie()

client.start().catch(error => {
    console.error('❌ Failed to start bot:', error)
    process.exit(1)
})

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error)
})

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error)
    process.exit(1)
})
