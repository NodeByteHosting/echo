import dotenv from 'dotenv'
import Indexie from './class/client.js'
import { existsSync } from 'node:fs'

dotenv.config()

const client = new Indexie()

client.start()

process.on('unhandledRejection', console.error)
process.on('uncaughtException', console.error)
