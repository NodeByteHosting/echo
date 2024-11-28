import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'
import { checkPermissions } from '../../functions/permissions.js'

const cooldown = new Map()

export default {
    event: Events.InteractionCreate,

    run: async (client, interaction) => {
        if (interaction.isContextMenuCommand()) {
            return
        }
        if (!interaction.isChatInputCommand()) {
            return
        }
        if (!interaction.isCommand()) {
            return
        }

        const command = client.slash.get(interaction.commandName) || client.private.get(interaction.commandName)

        if (!command) {
            return
        }

        const requiredPerms = command.structure.handlers.permissions || []

        if (requiredPerms.length > 0) {
            const hasPermission = await checkPermissions({ client, perms: requiredPerms, user: interaction.user })
            const fetchRoles = await client.db.prisma.user.findFirst({ where: { snowflakeId: interaction.user.id } })

            if (!hasPermission) {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [
                        new client.Gateway.EmbedBuilder()
                            .setTitle('ERROR: missing permissions')
                            .setColor(client.colors.error)
                            .setDescription('You do not have the permissions necessary to run this command.')
                            .setThumbnail(client.logo)
                            .addFields(
                                {
                                    name: 'Required permissions',
                                    value: requiredPerms.join(', ')
                                },
                                {
                                    name: 'Your permissions',
                                    value: fetchRoles.permissions.join(', ')
                                }
                            )
                    ]
                })
            }
        }

        try {
            if (command.handlers?.cooldown) {
                const isGlobalCooldown = command.handlers.globalCooldown
                const cooldownKey = isGlobalCooldown ? 'global_' + command.structure.name : interaction.user.id

                const cooldownFunction = () => {
                    const data = cooldown.get(cooldownKey)

                    data.push(interaction.commandName)

                    cooldown.set(cooldownKey, data)

                    setTimeout(() => {
                        let data = cooldown.get(cooldownKey)

                        data = data.filter(v => v !== interaction.commandName)

                        if (data.length <= 0) {
                            cooldown.delete(cooldownKey)
                        } else {
                            cooldown.set(cooldownKey, data)
                        }
                    }, command.handlers.cooldown)
                }

                if (cooldown.has(cooldownKey)) {
                    const data = cooldown.get(cooldownKey)

                    if (data.some(v => v === interaction.commandName)) {
                        const message = (
                            isGlobalCooldown
                                ? 'Slow down buddy, this command is on a global cooldown and you are using it to fast!'
                                : 'You are using this command too fast! Please wait: (${cooldown}s)'
                        ).replace('/${cooldown}/g', command.handlers.cooldown / 1000)

                        await interaction.reply({
                            content: message,
                            ephemeral: true
                        })

                        return
                    }
                    cooldownFunction()
                } else {
                    cooldown.set(cooldownKey, [interaction.commandName])
                    cooldownFunction()
                }
            }

            command.run(client, interaction)
        } catch (err) {
            log(`Failed to execute command: ${interaction.commandName}`, 'error')
            log(err, 'debug')

            await interaction.reply({
                content: 'An error occurred while executing this command!',
                ephemeral: true
            })
        }
    }
}
