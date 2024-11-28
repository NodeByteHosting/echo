import { readdirSync } from 'fs'
import { log } from '../functions/logger.js'

const moduleCommandsHandle = async (client, importPath, type) => {
    let module = await import(importPath)

    module = module.default

    if (!module) {
        return
    }

    if (!module.structure?.name || !module.run) {
        log(
            'Unable to load the command ' + importPath + " due to missing 'structure#name' and/ir 'run' properties",
            'warn'
        )
        return
    }

    if (['slash', 'context', 'private'].includes(type)) {
        client[type].set(module.structure.name, module)
        log(`Loaded new command: ` + importPath, 'info')
    }
}

const moduleInteractionsHandle = async (client, importFilePath, type) => {
    let module = await import(importFilePath)
    module = module.default
    if (!module) {
        return
    }

    const attr = type === 'autocompleteInteractions' ? 'commandName' : 'customId'
    if (!module[attr] || !module.run) {
        log(
            'Unable to load the component ' +
                importFilePath +
                " due to missing '" +
                attr +
                "' or/and 'run' properties.",
            'warn'
        )
        return
    }
    if (['buttonInteractions', 'selectInteractions', 'modalInteractions', 'autocompleteInteractions'].includes(type)) {
        client[type].set(module[attr], module)
        log(`Loaded new component: ${importFilePath}`, 'info')
    }
}

const moduleTriggersHandle = async (client, importFilePath) => {
    let module = await import(importFilePath)
    module = module.default
    if (!module) {
        return
    }

    client.triggers.set(module.name, module)

    log('Loaded new trigger: ' + importFilePath, 'info')
}

const moduleEventsHandle = async (client, importFilePath) => {
    let module = await import(importFilePath)
    module = module.default
    if (!module) {
        return
    }

    if (!module.event || !module.run) {
        log('Unable to load the event ' + importFilePath + " due to missing 'name' or/and 'run' properties.", 'warn')
        return
    }

    log('Loaded new event: ' + importFilePath, 'info')

    if (module.once) {
        client.once(module.event, (...args) => module.run(client, ...args))
    } else {
        client.on(module.event, async (...args) => await module.run(client, ...args))
    }
}

export const moduleHandle = async (client, path, type) => {
    let moduleImportHandle = moduleCommandsHandle
    if (type.endsWith('Interactions')) {
        moduleImportHandle = moduleInteractionsHandle
    }
    if (type.endsWith('Events')) {
        moduleImportHandle = moduleEventsHandle
    }
    if (type.endsWith('Triggers')) {
        moduleImportHandle = moduleTriggersHandle
    }

    const modulesDir = readdirSync(path)
    for (const module of modulesDir) {
        if (module.endsWith('.md')) {
            continue
        }
        if (module.endsWith('.js')) {
            await moduleImportHandle(client, `${path.replace('./src/', '../')}${module}`, type)
            continue
        }
        const submodFiles = readdirSync(`${path}${module}`).filter(file => file.endsWith('.js'))
        for (const submodule of submodFiles) {
            await moduleImportHandle(client, `${path.replace('./src/', '../')}${module}/${submodule}`, type)
        }
    }
}
