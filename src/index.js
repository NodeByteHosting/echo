import 'module-alias/register.js';
import dotenv from 'dotenv';
import Indexie from './class/client.js';

dotenv.config();

const client = new Indexie();

client.start();

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);