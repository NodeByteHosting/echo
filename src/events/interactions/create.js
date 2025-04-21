import { Events } from 'discord.js'
import { log } from '../../functions/logger.js'
import { PermissionHandler } from '../../functions/permissions.js'
import { getDefaultPermissions } from '../../functions/permissionUtils.js'

const cooldown = new Map()

export default {
    event: Events.InteractionCreate,

    run: async (client, interaction) => {
        if (interaction.isContextMenuCommand() || !interaction.isChatInputCommand() || !interaction.isCommand()) {
            return
        }

        const command = client.slash.get(interaction.commandName) || client.private.get(interaction.commandName)
        if (!command) {
            return
        }

        const requiredPerms = command.structure.handlers.permissions || []

        if (requiredPerms.length > 0) {
            const permHandler = new PermissionHandler(client.db.prisma)
            const user = await client.db.prisma.user.findFirst({
                where: { id: interaction.user.id },
                select: {
                    id: true,
                    role: true,
                    permissions: true,
                    isBanned: true,
                    bannedUntil: true
                }
            })

            if (!user) {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [
                        new client.Gateway.EmbedBuilder()
                            .setTitle('ERROR: User not registered')
                            .setColor(client.colors.error)
                            .setDescription('You need to be registered in the system to use this command.')
                            .setThumbnail(client.logo)
                    ]
                })
            }

            if (user.isBanned) {
                const banText = user.bannedUntil
                    ? `You are banned until ${user.bannedUntil.toLocaleString()}`
                    : 'You are permanently banned'

                return interaction.reply({
                    ephemeral: true,
                    embeds: [
                        new client.Gateway.EmbedBuilder()
                            .setTitle('Access Denied')
                            .setColor(client.colors.error)
                            .setDescription(banText)
                            .setThumbnail(client.logo)
                    ]
                })
            }

            const rolePerms = getDefaultPermissions(user.role)
            const userPerms = [...new Set([...rolePerms, ...user.permissions])]
            const missingPerms = requiredPerms.filter(perm => !userPerms.includes(perm))

            if (missingPerms.length > 0) {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [
                        new client.Gateway.EmbedBuilder()
                            .setTitle('ERROR: Missing Permissions')
                            .setColor(client.colors.error)
                            .setDescription('You lack the required permissions for this command.')
                            .addFields(
                                {
                                    name: 'Required Permissions',
                                    value: requiredPerms.join(', ')
                                },
                                {
                                    name: 'Your Role',
                                    value: user.role
                                },
                                {
                                    name: 'Your Permissions',
                                    value: userPerms.join(', ') || 'None'
                                }
                            )
                            .setThumbnail(client.logo)
                    ]
                })
            }
        }

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
                            ? 'Slow down buddy, this command is on a global cooldown and you are using it too fast!'
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

        try {
            await command.run(client, interaction)
        } catch (err) {
            log(`Failed to execute command: ${interaction.commandName}`, 'error')
            log(err, 'debug')

            await interaction.reply({
                ephemeral: true,
                content: 'An error occurred while executing this command!'
            })
        }
    }
}
