import chalk from 'chalk'
import debug from 'debug'

debug.enable('discord,discord:*')

debug.useColors = () => true

export const baseLog = debug('discord')

export const log = (string, style, ...args) => {
    const styles = {
        info: { prefix: chalk.blue('[INFO]'), logFunction: console.log, debugFunction: baseLog.extend('info') },
        err: { prefix: chalk.red('[ERROR]'), logFunction: console.error, debugFunction: baseLog.extend('error') },
        error: { prefix: chalk.red('[ERROR]'), logFunction: console.error, debugFunction: baseLog.extend('error') },
        debug: {
            prefix: chalk.magenta('[DEBUG]'),
            logFunction: console.log,
            debugFunction: baseLog.extend('debug'),
            enabled: true
        },
        warn: { prefix: chalk.yellow('[WARNING]'), logFunction: console.warn, debugFunction: baseLog.extend('warn') },
        done: { prefix: chalk.green('[SUCCESS]'), logFunction: console.log, debugFunction: baseLog.extend('done') }
    }

    const selectedStyle = styles[style] || { logFunction: console.log, debugFunction: baseLog.extend('log') }

    if (selectedStyle.debugFunction.enabled) {
        selectedStyle.debugFunction(string, ...args)
    } else {
        selectedStyle.logFunction(`${selectedStyle.prefix || ''} ${string}`, ...args)
    }
}
