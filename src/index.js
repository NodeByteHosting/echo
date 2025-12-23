import dotenv from 'dotenv'
import Indexie from '#classes/client.js'

dotenv.config()

console.log('🚀 Starting Echo bot...')
console.log('📁 Current directory:', process.cwd())
console.log('🔧 Node ENV:', process.env.NODE_ENV)

// Validate required environment variables
const requiredEnvVars = ['TOKEN', 'CLIENT_ID', 'DATABASE_URL']
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '))
    console.error('Please check your .env file or environment configuration')
    process.exit(1)
}

console.log('✅ All required environment variables are set')
console.log('🔌 Connecting to database...')

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
