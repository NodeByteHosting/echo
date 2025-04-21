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
                                    'By using our services, you agree to comply with these terms.'
                                ].join('\n')
                            )
                            .setColor(this.client.colors.primary)
                            .addFields([
                                {
                                    name: '📜 Terms of Service',
                                    value: '[View Terms](https://nodebyte.host/legal/terms)\nOur service terms and conditions',
                                    inline: true
                                },
                                {
                                    name: '🔒 Privacy Policy',
                                    value: '[View Policy](https://nodebyte.host/legal/privacy)\nHow we handle your data',
                                    inline: true
                                },
                                {
                                    name: '📋 Use License',
                                    value: '[View License](https://nodebyte.host/legal/license)\nService usage guidelines',
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
            }
        }
    }
}
