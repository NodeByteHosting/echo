/**
 * Handles support-related message responses
 * @class MessageHandler
 */
export class MessageHandler {
    constructor(client) {
        this.client = client
    }

    get send() {
        return {
            help: async message => {
                return message.channel.send({
                    embeds: [
                        new this.client.Gateway.EmbedBuilder()
                            .setTitle('NodeByte Support')
                            .setDescription('Here are the available support commands:')
                            .setColor(this.client.colors.primary)
                            .addFields([
                                {
                                    name: '`@Echo help`',
                                    value: 'Show this help message',
                                    inline: true
                                },
                                {
                                    name: '`@Echo support`',
                                    value: 'Get support instructions',
                                    inline: true
                                },
                                {
                                    name: '`@Echo legal`',
                                    value: 'View legal documents',
                                    inline: true
                                },
                                {
                                    name: '`@Echo source`',
                                    value: "View Echo's source code",
                                    inline: true
                                }
                            ])
                            .setThumbnail(this.client.logo)
                            .setTimestamp()
                            .setFooter({
                                text: this.client.footer,
                                iconURL: this.client.logo
                            })
                    ]
                })
            },

            support: async message => {
                return message.channel.send({
                    content: message.type === 19 ? `${message.mentions.repliedUser}` : `${message.author}`,
                    embeds: [
                        new this.client.Gateway.EmbedBuilder()
                            .setTitle('Support Information')
                            .setDescription(
                                [
                                    'To help us assist you better, please provide the following information when seeking support.',
                                    '',
                                    '**Support Channels:**',
                                    '• Community Support: <#1247657053292466257>',
                                    '• Support Ticket: <#1186079938089070662>',
                                    '• Feedback: <#1247655613631037580>',
                                    '• Email: support@nodebyte.host'
                                ].join('\n')
                            )
                            .setColor(this.client.colors.primary)
                            .addFields([
                                {
                                    name: '📝 Issue Description',
                                    value: '• What problem are you experiencing?\n• When did it start?\n• What were you doing when it happened?',
                                    inline: false
                                },
                                {
                                    name: '🔍 Troubleshooting Steps',
                                    value: '• What solutions have you already tried?\n• What were the results?\n• Any error messages received?',
                                    inline: false
                                },
                                {
                                    name: '📋 System Information',
                                    value: '• Operating System\n• Browser & Version\n• Any relevant software versions',
                                    inline: false
                                },
                                {
                                    name: '📎 Additional Context',
                                    value: '• Screenshots/Videos of the issue\n• Steps to reproduce the problem\n• Any recent changes made',
                                    inline: false
                                }
                            ])
                            .setThumbnail(this.client.logo)
                            .setTimestamp()
                            .setFooter({
                                text: 'Please be patient while waiting for a response',
                                iconURL: this.client.logo
                            })
                    ]
                })
            },

            legal: async message => {
                return message.channel.send({
                    content: message.type === 19 ? `${message.mentions.repliedUser}` : `${message.author}`,
                    embeds: [
                        new this.client.Gateway.EmbedBuilder()
                            .setTitle('Legal Documentation')
                            .setDescription(
                                [
                                    'Please review our legal documents before using our services.',
                                    '',
                                    '**Important Notice:**',
                                    'By using our services, you agree to comply with these terms.',
                                    '',
                                    '**Need Help?**',
                                    'Contact our legal team at legal@nodebyte.host'
                                ].join('\n')
                            )
                            .setColor(this.client.colors.primary)
                            .addFields([
                                {
                                    name: '📜 Terms of Service',
                                    value: '[View Terms](https://nodebyte.host/legal/terms)\nKey guidelines and service terms',
                                    inline: true
                                },
                                {
                                    name: '🔒 Privacy Policy',
                                    value: '[View Policy](https://nodebyte.host/legal/privacy)\nData handling and protection',
                                    inline: true
                                },
                                {
                                    name: '💰 Refund Policy',
                                    value: '[View Policy](https://nodebyte.host/legal/refunds)\nRefund terms and conditions',
                                    inline: true
                                },
                                {
                                    name: '🍪 Cookie Policy',
                                    value: '[View Policy](https://nodebyte.host/legal/cookies)\nHow we use cookies',
                                    inline: true
                                },
                                {
                                    name: '⚖️ DMCA Policy',
                                    value: '[View Policy](https://nodebyte.host/legal/dmca)\nCopyright protection procedures',
                                    inline: true
                                }
                            ])
                            .setThumbnail(this.client.logo)
                            .setTimestamp()
                            .setFooter({
                                text: this.client.footer,
                                iconURL: this.client.logo
                            })
                    ]
                })
            },

            source: async message => {
                return message.channel.send({
                    content: message.type === 19 ? `${message.mentions.repliedUser}` : `${message.author}`,
                    embeds: [
                        new this.client.Gateway.EmbedBuilder()
                            .setTitle('Echo Source Code')
                            .setDescription(
                                [
                                    'Hey there, did you know this fox is open-source!? You can view, contribute to, or fork my source code on GitHub:',
                                    '',
                                    '**[GitHub Repository: NodeByteHosting/echo](https://github.com/NodeByteHosting/echo)**',
                                    '',
                                    'Feel free to star the repo if you find me helpful, or submit issues and pull requests if you want to help improve my code.',
                                    '',
                                    '**Tech Stack:**',
                                    '• Discord.js',
                                    '• Node.js',
                                    '• Prisma ORM',
                                    '• PostgreSQL',
                                    '• OpenAI API',
                                    '',
                                    '**Documentation:**',
                                    '• [Setup Guide](https://github.com/NodeByteHosting/echo/blob/master/docs/setup.md)',
                                    '• [AI System](https://github.com/NodeByteHosting/echo/blob/master/docs/ai.md)',
                                    '• [Database Setup](https://github.com/NodeByteHosting/echo/blob/master/docs/database.md)',
                                    '• [Database Schema](https://github.com/NodeByteHosting/echo/blob/master/docs/schema.md)',
                                    '• [Commands Reference](https://github.com/NodeByteHosting/echo/blob/master/docs/commands.md)',
                                    '• [System Architecture](https://github.com/NodeByteHosting/echo/blob/master/docs/architecture.md)',
                                    '• [Migration Guide](https://github.com/NodeByteHosting/echo/blob/master/docs/migrations.md)',
                                    '• [Audit Logging](https://github.com/NodeByteHosting/echo/blob/master/docs/audit-logging.md)',
                                    '• [Full Documentation](https://github.com/NodeByteHosting/echo/blob/master/docs/README.md)'
                                ].join('\n')
                            )
                            .setColor(this.client.colors.primary)
                            .addFields([
                                {
                                    name: '👨‍💻 Contribute',
                                    value: 'Submit pull requests to add features or fix bugs.',
                                    inline: true
                                },
                                {
                                    name: '🐛 Report Issues',
                                    value: 'Found a bug? Report it on the GitHub issues page.',
                                    inline: true
                                },
                                {
                                    name: '⭐ Star the Repo',
                                    value: 'Show your support by starring the repository!',
                                    inline: true
                                }
                            ])
                            .setThumbnail(this.client.logo)
                            .setTimestamp()
                            .setFooter({
                                text: 'Licensed under the AGPL 3.0 License',
                                iconURL: this.client.logo
                            })
                    ]
                })
            }
        }
    }
}
