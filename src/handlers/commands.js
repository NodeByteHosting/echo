import { moduleHandle } from './loader.js'

const commands = async client => {
    await moduleHandle(client, './src/commands/', 'slash')
    // await moduleHandle(client, './src/context/', 'context');
}

export default commands
