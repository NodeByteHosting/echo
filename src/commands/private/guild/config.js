import { cmdTypes } from '../../../configs/cmdTypes.config.js'

export default {
    structure: {
        name: 'config',
        description: 'Configure how our guild uses Echo',
        category: 'admin',
        handlers: {
            cooldown: 5000,
            permissions: ['ADMIN', 'DEVELOPER']
        },
        options: [
            {
                name: 'view',
                description: 'View current guild configuration',
                type: cmdTypes.SUB_COMMAND
            },
            {
                name: 'set_channel',
                description: 'Set a specific channel configuration',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'type',
                        description: 'The type of channel to set',
                        type: cmdTypes.STRING,
                        required: true,
                        choices: [
                            { name: 'Audit Logs', value: 'logChannelId' },
                            { name: 'Moderation Logs', value: 'modLogChannelId' },
                            { name: 'Support Category', value: 'supportCategoryId' },
                            { name: 'Ticket Logs', value: 'ticketLogChannelId' },
                            { name: 'Welcome Messages', value: 'welcomeChannelId' }
                        ]
                    },
                    {
                        name: 'channel',
                        description: 'The channel to use',
                        type: cmdTypes.CHANNEL,
                        required: true
                    }
                ]
            },
            {
                name: 'set_role',
                description: 'Set a specific role configuration',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'type',
                        description: 'The type of role to set',
                        type: cmdTypes.STRING,
                        required: true,
                        choices: [
                            { name: 'Admin Role', value: 'adminRoleId' },
                            { name: 'Moderator Role', value: 'modRoleId' },
                            { name: 'Support Role', value: 'supportRoleId' }
                        ]
                    },
                    {
                        name: 'role',
                        description: 'The role to use',
                        type: cmdTypes.ROLE,
                        required: true
                    }
                ]
            },
            {
                name: 'audit_events',
                description: 'Configure which events to log',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'event',
                        description: 'The event type to toggle',
                        type: cmdTypes.STRING,
                        required: true,
                        choices: [
                            { name: 'Message Events', value: 'MESSAGE_EVENTS' },
                            { name: 'Member Events', value: 'MEMBER_EVENTS' },
                            { name: 'Channel Events', value: 'CHANNEL_EVENTS' },
                            { name: 'Role Events', value: 'ROLE_EVENTS' },
                            { name: 'Moderation Events', value: 'MOD_EVENTS' },
                            { name: 'Voice Events', value: 'VOICE_EVENTS' },
                            { name: 'Thread Events', value: 'THREAD_EVENTS' }
                        ]
                    },
                    {
                        name: 'enabled',
                        description: 'Whether to enable or disable the event',
                        type: cmdTypes.BOOLEAN,
                        required: true
                    }
                ]
            },
            {
                name: 'reset',
                description: 'Reset a specific configuration setting',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'setting',
                        description: 'The setting to reset',
                        type: cmdTypes.STRING,
                        required: true,
                        choices: [
                            { name: 'Audit Logs Channel', value: 'logChannelId' },
                            { name: 'Moderation Logs Channel', value: 'modLogChannelId' },
                            { name: 'Support Category', value: 'supportCategoryId' },
                            { name: 'Ticket Logs Channel', value: 'ticketLogChannelId' },
                            { name: 'Welcome Channel', value: 'welcomeChannelId' },
                            { name: 'Admin Role', value: 'adminRoleId' },
                            { name: 'Moderator Role', value: 'modRoleId' },
                            { name: 'Support Role', value: 'supportRoleId' },
                            { name: 'All Audit Events', value: 'auditEvents' },
                            { name: 'All Settings', value: 'all' }
                        ]
                    }
                ]
            }
        ]
    },

    run: async (client, interaction) => {
        await interaction.deferReply()
        const subCommand = interaction.options.getSubcommand()

        try {
            const guildId = interaction.guild.id
            const guildName = interaction.guild.name

            // Access the database directly from the client
            // db is already instantiated and available as client.db
            const database = client.db

            // Get guild config
            let guildConfig = await database.guild.getConfig(guildId)

            // If no config exists, create a default one
            if (!guildConfig) {
                guildConfig = await database.guild.updateConfig(guildId, { name: guildName })
            }

            switch (subCommand) {
                case 'view': {
                    // Format channel data
                    const channelFields = [
                        {
                            name: '📺 Channels',
                            value: formatChannelConfig(guildConfig, interaction.guild),
                            inline: false
                        },
                        {
                            name: '🏷️ Roles',
                            value: formatRoleConfig(guildConfig, interaction.guild),
                            inline: false
                        },
                        {
                            name: '📝 Audit Events',
                            value: formatAuditEvents(guildConfig),
                            inline: false
                        }
                    ]

                    // Create and send embed
                    const embed = new client.Gateway.EmbedBuilder()
                        .setTitle(`⚙️ Guild Configuration: ${interaction.guild.name}`)
                        .setDescription('Server configuration for Echo. Use `/config` commands to modify settings.')
                        .setColor(client.colors.primary)
                        .addFields(channelFields)
                        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                        .setTimestamp()
                        .setFooter({ text: client.footer, iconURL: client.logo })

                    await interaction.editReply({ embeds: [embed] })
                    break
                }

                case 'set_channel': {
                    const channelType = interaction.options.getString('type')
                    const channel = interaction.options.getChannel('channel')

                    // Validate channel permissions - check if bot can view/send to the channel
                    if (!validateChannelPermissions(channel, client.user.id, channelType)) {
                        return interaction.editReply({
                            content:
                                "⚠️ I don't have sufficient permissions in that channel. I need at least View Channel and Send Messages permissions."
                        })
                    }

                    // Validate channel type based on the setting
                    if (channelType === 'supportCategoryId' && channel.type !== 4) {
                        return interaction.editReply({
                            content: '❌ Support category must be a category channel.'
                        })
                    }

                    if (channelType !== 'supportCategoryId' && channel.type !== 0 && channel.type !== 5) {
                        return interaction.editReply({
                            content: '❌ This setting requires a text channel or announcement channel.'
                        })
                    }

                    // Update config and log the change
                    await database.guild.updateConfig(guildId, { [channelType]: channel.id })

                    // Log the configuration change
                    await logConfigChange(
                        client,
                        interaction,
                        'Channel Setting',
                        `${formatSettingName(channelType)} set to ${channel.name}`
                    )

                    // Create success embed with visual confirmation
                    const successEmbed = new client.Gateway.EmbedBuilder()
                        .setTitle('✅ Channel Configuration Updated')
                        .setDescription(`${formatSettingName(channelType)} has been set to ${channel}`)
                        .setColor(client.colors.success)
                        .setTimestamp()

                    return interaction.editReply({ embeds: [successEmbed] })
                }

                case 'set_role': {
                    const roleType = interaction.options.getString('type')
                    const role = interaction.options.getRole('role')

                    // Validate role - ensure it's not @everyone, managed, or higher than bot's role
                    if (role.id === interaction.guild.id) {
                        return interaction.editReply({
                            content: '❌ You cannot set @everyone as a specific role.'
                        })
                    }

                    if (role.managed) {
                        return interaction.editReply({
                            content: '❌ You cannot set integration-managed roles (bot roles).'
                        })
                    }

                    const botMember = await interaction.guild.members.fetch(client.user.id)
                    const botHighestRole = botMember.roles.highest

                    if (role.position >= botHighestRole.position) {
                        return interaction.editReply({
                            content: '❌ I cannot manage this role as it is higher than or equal to my highest role.'
                        })
                    }

                    // Update the config
                    await database.guild.updateConfig(guildId, { [roleType]: role.id })

                    // Log the configuration change
                    await logConfigChange(
                        client,
                        interaction,
                        'Role Setting',
                        `${formatSettingName(roleType)} set to ${role.name}`
                    )

                    // Create success embed
                    const successEmbed = new client.Gateway.EmbedBuilder()
                        .setTitle('✅ Role Configuration Updated')
                        .setDescription(`${formatSettingName(roleType)} has been set to ${role}`)
                        .setColor(client.colors.success)
                        .setTimestamp()

                    return interaction.editReply({ embeds: [successEmbed] })
                }

                case 'audit_events': {
                    const event = interaction.options.getString('event')
                    const enabled = interaction.options.getBoolean('enabled')

                    // Get current events
                    let events = [...(guildConfig.auditEvents || [])]

                    // Update events array
                    if (enabled && !events.includes(event)) {
                        events.push(event)
                    } else if (!enabled) {
                        events = events.filter(e => e !== event)
                    } else {
                        // Event already enabled
                        return interaction.editReply({
                            content: `ℹ️ ${event.replace(/_/g, ' ')} is already ${enabled ? 'enabled' : 'disabled'}.`
                        })
                    }

                    // Update the config
                    await database.guild.updateConfig(guildId, { auditEvents: events })

                    // Log the configuration change
                    await logConfigChange(
                        client,
                        interaction,
                        'Audit Events',
                        `${event.replace(/_/g, ' ')} ${enabled ? 'enabled' : 'disabled'}`
                    )

                    // Create success embed
                    const successEmbed = new client.Gateway.EmbedBuilder()
                        .setTitle(`✅ Audit Events ${enabled ? 'Enabled' : 'Disabled'}`)
                        .setDescription(`**${event.replace(/_/g, ' ')}** has been ${enabled ? 'enabled' : 'disabled'}.`)
                        .setColor(client.colors.success)
                        .addFields([
                            {
                                name: 'Current Audit Events',
                                value:
                                    events.length > 0
                                        ? events.map(e => `✅ ${e.replace(/_/g, ' ')}`).join('\n')
                                        : 'No events configured',
                                inline: false
                            }
                        ])
                        .setTimestamp()

                    return interaction.editReply({ embeds: [successEmbed] })
                }

                case 'reset': {
                    const setting = interaction.options.getString('setting')

                    // Handle resetting all settings
                    if (setting === 'all') {
                        // Create a new default config (only preserving the guild ID and name)
                        await database.guild.updateConfig(guildId, {
                            name: guildName,
                            logChannelId: null,
                            modLogChannelId: null,
                            supportCategoryId: null,
                            ticketLogChannelId: null,
                            welcomeChannelId: null,
                            modRoleId: null,
                            adminRoleId: null,
                            supportRoleId: null,
                            auditEvents: []
                        })

                        // Log the configuration change
                        await logConfigChange(client, interaction, 'Reset', 'All configuration settings reset')

                        return interaction.editReply({
                            content: '✅ All configuration settings have been reset to defaults.'
                        })
                    }

                    // Reset specific setting
                    if (setting === 'auditEvents') {
                        await database.guild.updateConfig(guildId, { auditEvents: [] })
                    } else {
                        await database.guild.updateConfig(guildId, { [setting]: null })
                    }

                    // Log the configuration change
                    await logConfigChange(client, interaction, 'Reset', `${formatSettingName(setting)} has been reset`)

                    return interaction.editReply({
                        content: `✅ ${formatSettingName(setting)} has been reset.`
                    })
                }
            }
        } catch (error) {
            console.error('Error in guild config command:', error)

            // More specific error messages based on error type
            let errorMessage = '❌ An error occurred while processing your request.'

            if (error.code === 'MISSING_PERMISSIONS') {
                errorMessage = "❌ I don't have the necessary permissions to modify that setting."
            } else if (error.code === 'GUILD_MEMBERS_TIMEOUT') {
                errorMessage = '❌ Timed out while fetching guild members. Please try again.'
            } else if (error.message.includes('database')) {
                errorMessage = '❌ A database error occurred. Please try again later.'
            }

            return interaction.editReply({
                content: errorMessage
            })
        }
        return null
    }
}

/**
 * Format channel configuration for display
 * @param {Object} config - Guild configuration
 * @param {Object} guild - Guild object
 * @returns {string} Formatted channel information
 */
function formatChannelConfig(config, guild) {
    const channelSettings = [
        { name: 'Audit Logs', id: config.logChannelId },
        { name: 'Mod Logs', id: config.modLogChannelId },
        { name: 'Support Category', id: config.supportCategoryId },
        { name: 'Ticket Logs', id: config.ticketLogChannelId },
        { name: 'Welcome', id: config.welcomeChannelId }
    ]

    return channelSettings
        .map(setting => {
            const channel = setting.id ? guild.channels.cache.get(setting.id) : null
            const status = channel ? `<#${setting.id}> ${channel.type === 4 ? '(Category)' : ''}` : '`Not set`'
            return `**${setting.name}:** ${status}`
        })
        .join('\n')
}

/**
 * Format role configuration for display
 * @param {Object} config - Guild configuration
 * @param {Object} guild - Guild object
 * @returns {string} Formatted role information
 */
function formatRoleConfig(config, guild) {
    const roleSettings = [
        { name: 'Admin', id: config.adminRoleId },
        { name: 'Moderator', id: config.modRoleId },
        { name: 'Support', id: config.supportRoleId }
    ]

    return roleSettings
        .map(setting => {
            const role = setting.id ? guild.roles.cache.get(setting.id) : null
            const status = role ? `<@&${setting.id}>` : '`Not set`'
            return `**${setting.name}:** ${status}`
        })
        .join('\n')
}

/**
 * Format audit event configuration for display
 * @param {Object} config - Guild configuration
 * @returns {string} Formatted audit event information
 */
function formatAuditEvents(config) {
    if (!config.auditEvents || config.auditEvents.length === 0) {
        return '`No audit events configured`'
    }

    return config.auditEvents.map(event => `✅ **${event.replace(/_/g, ' ')}**`).join('\n')
}

/**
 * Validate channel permissions for the bot
 * @param {Object} channel - The channel to validate
 * @param {string} botId - The bot's user ID
 * @param {string} channelType - The type of channel being set
 * @returns {boolean} Whether the channel has valid permissions
 */
function validateChannelPermissions(channel, botId, channelType) {
    // For categories, only need VIEW_CHANNEL
    if (channel.type === 4) {
        // GUILD_CATEGORY
        return channel.permissionsFor(botId).has('VIEW_CHANNEL')
    }

    // For regular channels, need more permissions
    const requiredPerms = ['VIEW_CHANNEL', 'SEND_MESSAGES']

    // Add more specific permissions based on channel type
    if (channelType === 'logChannelId' || channelType === 'modLogChannelId' || channelType === 'ticketLogChannelId') {
        requiredPerms.push('EMBED_LINKS')
    }

    if (channelType === 'welcomeChannelId') {
        requiredPerms.push('EMBED_LINKS', 'ATTACH_FILES')
    }

    return requiredPerms.every(perm => channel.permissionsFor(botId).has(perm))
}

/**
 * Format setting name for display
 * @param {string} setting - The setting key
 * @returns {string} Formatted setting name
 */
function formatSettingName(setting) {
    if (setting === 'all') {
        return 'All settings'
    }
    if (setting === 'auditEvents') {
        return 'Audit events'
    }

    return setting
        .replace(/Id$/, '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
}

/**
 * Log configuration changes to the audit log channel
 * @param {Object} client - Discord client
 * @param {Object} interaction - Command interaction
 * @param {string} settingType - Type of setting changed
 * @param {string} details - Details of the change
 */
async function logConfigChange(client, interaction, settingType, details) {
    try {
        // Access database directly from client
        const database = client.db
        const guildId = interaction.guild.id

        // Get the log channel ID
        const guildConfig = await database.guild.getConfig(guildId)
        const logChannelId = guildConfig?.logChannelId

        if (!logChannelId) {
            return
        } // No log channel set

        const logChannel = interaction.guild.channels.cache.get(logChannelId)
        if (!logChannel) {
            return
        } // Channel not found

        // Create and send the log embed
        const logEmbed = new client.Gateway.EmbedBuilder()
            .setTitle('📝 Configuration Changed')
            .setDescription(`Guild configuration has been updated`)
            .addFields([
                { name: 'Setting Type', value: settingType, inline: true },
                { name: 'Details', value: details, inline: true },
                { name: 'Modified By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false }
            ])
            .setColor(client.colors.info)
            .setTimestamp()

        await logChannel.send({ embeds: [logEmbed] })
    } catch (error) {
        console.error('Error logging config change:', error)
        // Don't fail the command if logging fails
    }
}
