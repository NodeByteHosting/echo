import { cmdTypes } from '../../../configs/cmdTypes.config.js'
import { aiService } from '../../../services/ai.service.js'

export default {
    structure: {
        name: 'system',
        description: 'Manage system settings and view performance metrics',
        category: 'admin',
        handlers: {
            cooldown: 5000,
            permissions: ['ADMIN', 'DEVELOPER']
        },
        options: [
            {
                name: 'performance',
                description: 'View detailed system performance metrics',
                type: cmdTypes.SUB_COMMAND
            },
            {
                name: 'maintenance',
                description: 'Toggle maintenance mode',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'enable',
                        description: 'Enable or disable maintenance mode',
                        type: cmdTypes.BOOLEAN,
                        required: true
                    }
                ]
            },
            {
                name: 'debug',
                description: 'Toggle debug mode for detailed logging',
                type: cmdTypes.SUB_COMMAND,
                options: [
                    {
                        name: 'enable',
                        description: 'Enable or disable debug mode',
                        type: cmdTypes.BOOLEAN,
                        required: true
                    }
                ]
            },
            {
                name: 'reset_metrics',
                description: 'Reset performance metrics counters',
                type: cmdTypes.SUB_COMMAND
            }
        ]
    },

    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true })

        const subCommand = interaction.options.getSubcommand()

        try {
            switch (subCommand) {
                case 'performance': {
                    const metrics = aiService.performance.getAllMetrics()
                    const uptime = Math.floor(process.uptime())
                    const memory = process.memoryUsage()

                    const embed = new client.Gateway.EmbedBuilder()
                        .setTitle('🔧 System Performance Metrics')
                        .setColor(client.colors.primary)
                        .addFields([
                            {
                                name: 'System',
                                value: [
                                    `⏱️ Uptime: ${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
                                    `💾 Memory: ${Math.round(memory.heapUsed / 1024 / 1024)}MB / ${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
                                    `🔄 Load: ${Math.round(process.cpuUsage().user / 1000000)}%`
                                ].join('\\n'),
                                inline: false
                            },
                            {
                                name: 'AI Service',
                                value: [
                                    `📊 Total Requests: ${metrics.totalRequests || 0}`,
                                    `⚡ Avg Response Time: ${metrics.avgResponseTime ? Math.round(metrics.avgResponseTime) + 'ms' : 'N/A'}`,
                                    `❌ Error Rate: ${metrics.errorRate ? (metrics.errorRate * 100).toFixed(2) + '%' : '0%'}`
                                ].join('\\n'),
                                inline: false
                            },
                            {
                                name: 'Cache',
                                value: [
                                    `💫 Hit Rate: ${metrics.cacheHitRate ? (metrics.cacheHitRate * 100).toFixed(2) + '%' : '0%'}`,
                                    `🗑️ Eviction Rate: ${metrics.cacheEvictionRate ? (metrics.cacheEvictionRate * 100).toFixed(2) + '%' : '0%'}`
                                ].join('\\n'),
                                inline: false
                            }
                        ])
                        .setTimestamp()
                        .setFooter({ text: client.footer, iconURL: client.logo })

                    return interaction.editReply({ embeds: [embed] })
                }

                case 'maintenance': {
                    const enable = interaction.options.getBoolean('enable')
                    client.maintenance = enable

                    // Update bot presence to reflect maintenance mode
                    if (enable) {
                        await client.user.setPresence({
                            activities: [{ name: '🛠️ Maintenance Mode', type: 4 }],
                            status: 'dnd'
                        })
                    } else {
                        await client.user.setPresence({
                            activities: [{ name: '/help', type: 4 }],
                            status: 'online'
                        })
                    }

                    return interaction.editReply({
                        content: `✅ ${enable ? 'Enabled' : 'Disabled'} maintenance mode successfully.`
                    })
                }

                case 'debug': {
                    const enable = interaction.options.getBoolean('enable')
                    client.debug = enable

                    return interaction.editReply({
                        content: `✅ ${enable ? 'Enabled' : 'Disabled'} debug mode successfully.`
                    })
                }

                case 'reset_metrics': {
                    aiService.performance.resetMetrics()

                    return interaction.editReply({
                        content: '✅ Successfully reset all performance metrics.'
                    })
                }
            }
            return null // Default return value for switch statement
        } catch (error) {
            console.error('Error in system command:', error)
            return interaction.editReply({
                content: '❌ An error occurred while processing your request.'
            })
        }
    }
}
