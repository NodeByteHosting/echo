import { readdirSync } from 'node:fs';
import { moduleHandle } from './loader.js';

const events = async (client) => {
    for (const dir of readdirSync('./src/events/')) {
        await moduleHandle(client, `./src/events/${dir}/`, 'Events');
    }
}

export default events;