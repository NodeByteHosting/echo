import dotenv from 'dotenv'
import Indexie from '@classes/client'

dotenv.config()

const client = new Indexie()

client.start()

process.on('unhandledRejection', console.error)
process.on('uncaughtException', console.error)
