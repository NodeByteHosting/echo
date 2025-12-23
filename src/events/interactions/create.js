import { Events, MessageFlags } from 'discord.js'
import { log } from '../../functions/logger.js'
import { getDefaultPermissions } from '../../functions/permissionUtils.js'

const cooldown = new Map()

export default {
    event: Events.InteractionCreate,
    run: async (client, interaction) => {
        // Handle AI control buttons
        if (interaction.isButton()) {
            const { handleAIControls } = await import('../../handlers/aiControls.js')
            const handled = await handleAIControls(interaction)
            if (handled) {
                return null
            }
        }

        if (interaction.isContextMenuCommand() || !interaction.isChatInputCommand() || !interaction.isCommand()) {
            return null
        }

        const command = client.slash.get(interaction.commandName) || client.private.get(interaction.commandName)
        if (!command) {
            return null
        }

        // Get required permissions from command structure
        const requiredPerms = command.structure.handlers.permissions || []

        if (requiredPerms.length > 0) {
            const user = await client.db.prisma.user.findFirst({
                where: { id: BigInt(interaction.user.id) },
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
                    flags: MessageFlags.Ephemeral,
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
                    flags: MessageFlags.Ephemeral,
                    embeds: [
                        new client.Gateway.EmbedBuilder()
                            .setTitle('Access Denied')
                            .setColor(client.colors.error)
                            .setDescription(banText)
                            .setThumbnail(client.logo)
                    ]
                })
            } // Get default permissions for user's role and combine with their custom permissions
            const rolePerms = getDefaultPermissions(user.role)
            const userPerms = [...new Set([...rolePerms, ...user.permissions])]

            // Check each required permission
            const missingPerms = []
            for (const perm of requiredPerms) {
                // Special handling for ADMINISTRATOR role
                if (user.role === 'ADMIN') {
                    continue
                }
                // Check if user has the required permission
                if (!userPerms.includes(perm)) {
                    missingPerms.push(perm)
                }
            }

            if (missingPerms.length > 0) {
                return interaction.reply({
                    flags: MessageFlags.Ephemeral,
                    embeds: [
                        new client.Gateway.EmbedBuilder()
                            .setTitle('Permission Denied')
                            .setColor(client.colors.error)
                            .setDescription('You lack the required permissions for this command.')
                            .addFields(
                                {
                                    name: 'Required Permissions',
                                    value: requiredPerms.map(p => `\`${p}\``).join(', ')
                                },
                                {
                                    name: 'Your Role',
                                    value: `\`${user.role}\``
                                },
                                {
                                    name: 'Your Permissions',
                                    value: userPerms.length ? userPerms.map(p => `\`${p}\``).join(', ') : 'None'
                                },
                                {
                                    name: 'Missing Permissions',
                                    value: missingPerms.map(p => `\`${p}\``).join(', ')
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
                        flags: MessageFlags.Ephemeral
                    })

                    return null
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
                flags: MessageFlags.Ephemeral,
                content: 'An error occurred while executing this command!'
            })
        }

        return null // Return value for async method
    }
}
