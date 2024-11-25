import { readdirSync } from 'node:fs';
import { moduleHandle } from './loader.js';

const events = async (client) => {
    for (const dir of readdirSync('./src/triggers/')) {
        await moduleHandle(client, `./src/triggers/${dir}/`, 'Triggers');
    };
};

export default events;