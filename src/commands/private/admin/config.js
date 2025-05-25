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
            }
        ]
    },

    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true })

        const subCommand = interaction.options.getSubcommand()

        try {
            // Get or create guild config
            let guildConfig = await client.db.prisma.guildConfig.upsert({
                where: { id: interaction.guild.id },
                create: {
                    id: interaction.guild.id,
                    name: interaction.guild.name
                },
                update: {}
            })

            switch (subCommand) {
                case 'view': {
                    const embed = new client.Gateway.EmbedBuilder()
                        .setTitle('📝 Guild Configuration')
                        .setColor(client.colors.primary)
                        .addFields([
                            {
                                name: 'Channels',
                                value: [
                                    `**Audit Logs:** ${guildConfig.logChannelId ? `<#${guildConfig.logChannelId}>` : 'Not set'}`,
                                    `**Mod Logs:** ${guildConfig.modLogChannelId ? `<#${guildConfig.modLogChannelId}>` : 'Not set'}`,
                                    `**Support Category:** ${guildConfig.supportCategoryId ? `<#${guildConfig.supportCategoryId}>` : 'Not set'}`,
                                    `**Ticket Logs:** ${guildConfig.ticketLogChannelId ? `<#${guildConfig.ticketLogChannelId}>` : 'Not set'}`,
                                    `**Welcome:** ${guildConfig.welcomeChannelId ? `<#${guildConfig.welcomeChannelId}>` : 'Not set'}`
                                ].join('\\n'),
                                inline: false
                            },
                            {
                                name: 'Roles',
                                value: [
                                    `**Admin:** ${guildConfig.adminRoleId ? `<@&${guildConfig.adminRoleId}>` : 'Not set'}`,
                                    `**Moderator:** ${guildConfig.modRoleId ? `<@&${guildConfig.modRoleId}>` : 'Not set'}`,
                                    `**Support:** ${guildConfig.supportRoleId ? `<@&${guildConfig.supportRoleId}>` : 'Not set'}`
                                ].join('\\n'),
                                inline: false
                            },
                            {
                                name: 'Audit Events',
                                value:
                                    guildConfig.auditEvents?.length > 0
                                        ? guildConfig.auditEvents
                                              .map(event => `✅ ${event.replace(/_/g, ' ')}`)
                                              .join('\\n')
                                        : 'No events configured',
                                inline: false
                            }
                        ])
                        .setTimestamp()
                        .setFooter({ text: client.footer, iconURL: client.logo })

                    return interaction.editReply({ embeds: [embed] })
                }

                case 'set_channel': {
                    const type = interaction.options.getString('type')
                    const channel = interaction.options.getChannel('channel')

                    // Validate channel type based on setting
                    if (type === 'supportCategoryId' && channel.type !== 4) {
                        // 4 is GUILD_CATEGORY
                        return interaction.editReply({
                            content: '❌ Support category must be a category channel.'
                        })
                    }

                    if (type !== 'supportCategoryId' && channel.type !== 0) {
                        // 0 is GUILD_TEXT
                        return interaction.editReply({
                            content: '❌ This setting requires a text channel.'
                        })
                    }

                    // Update the config
                    guildConfig = await client.db.prisma.guildConfig.update({
                        where: { id: interaction.guild.id },
                        data: { [type]: channel.id }
                    })

                    return interaction.editReply({
                        content: `✅ Successfully set ${type
                            .replace(/Id$/, '')
                            .replace(/([A-Z])/g, ' $1')
                            .toLowerCase()} to ${channel}.`
                    })
                }

                case 'set_role': {
                    const type = interaction.options.getString('type')
                    const role = interaction.options.getRole('role')

                    // Update the config
                    guildConfig = await client.db.prisma.guildConfig.update({
                        where: { id: interaction.guild.id },
                        data: { [type]: role.id }
                    })

                    return interaction.editReply({
                        content: `✅ Successfully set ${type
                            .replace(/Id$/, '')
                            .replace(/([A-Z])/g, ' $1')
                            .toLowerCase()} to ${role}.`
                    })
                }

                case 'audit_events': {
                    const event = interaction.options.getString('event')
                    const enabled = interaction.options.getBoolean('enabled')

                    // Get current events
                    let events = guildConfig.auditEvents || []

                    if (enabled && !events.includes(event)) {
                        events.push(event)
                    } else if (!enabled) {
                        events = events.filter(e => e !== event)
                    }

                    // Update the config
                    guildConfig = await client.db.prisma.guildConfig.update({
                        where: { id: interaction.guild.id },
                        data: { auditEvents: events }
                    })

                    return interaction.editReply({
                        content: `✅ Successfully ${enabled ? 'enabled' : 'disabled'} ${event.replace(/_/g, ' ').toLowerCase()}.`
                    })
                }
            }
        } catch (error) {
            console.error('Error in guild_config command:', error)
            return interaction.editReply({
                content: '❌ An error occurred while processing your request.'
            })
        }
        return null
    }
}
