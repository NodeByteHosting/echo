import { pagination, ButtonTypes, ButtonStyles } from '@devraelfreeze/discordjs-pagination'
import { formattedSize } from '../../../functions/formattedSize.js'
import axios from 'axios'

export default {
    structure: {
        name: 'nodes',
        category: 'Pterodactyl',
        description: 'List all nodes and their information.',
        handlers: {
            cooldown: 15000,
            permissions: []
        }
    },

    run: async (client, interaction) => {
        const apiUrl = process.env.PTERODACTYL_API_URL
        const apiKey = process.env.PTERODACTYL_API_KEY

        await interaction.deferReply()

        const response = await axios
            .get(`${apiUrl}/api/application/nodes`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            })
            .catch(err => {
                console.error('Bruhh:' + err.stack)
            })

        if (response.data && response.data.data) {
            const nodes = response.data.data

            const embeds = nodes.map(node => {
                const attr = node.attributes
                const maint = attr.maintenance_mode ? '🔧 Active' : '❌ Inactive'

                const availMemory = formattedSize(attr.memory)
                const availDisk = formattedSize(attr.disk)
                const usedMemory = formattedSize(attr.allocated_resources.memory)
                const usedDisk = formattedSize(attr.allocated_resources.disk)
                const uploadSize = formattedSize(attr.upload_size)
                const overalloc = formattedSize(attr.memory_overallocate + attr.disk_overallocate)

                return new client.Gateway.EmbedBuilder()
                    .setTitle(attr.name === 'ThunderDuck-MC-EU' ? 'Node: DEDI-MC-US-01' : 'Node: DEDI-MC-GER-01')
                    .setColor(client.colors.primary)
                    .setThumbnail(client.logo)
                    .addFields(
                        { name: 'Maintenance Mode:', value: maint, inline: true },
                        { name: 'Memory Available:', value: availMemory, inline: true },
                        { name: 'Storage Available:', value: availDisk, inline: true },
                        { name: 'Memory Used:', value: usedMemory, inline: true },
                        { name: 'Storage Used:', value: usedDisk, inline: true },
                        { name: 'Overallocation:', value: overalloc, inline: true },
                        { name: 'Upload Size:', value: uploadSize, inline: true },
                        { name: 'Created At:', value: new Date(attr.created_at).toLocaleString(), inline: true },
                        { name: 'Updated At:', value: new Date(attr.updated_at).toLocaleString(), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({
                        text: client.footer,
                        iconURL: client.logo
                    })
            })

            return pagination({
                embeds: embeds,
                author: interaction.member.user,
                interaction: interaction,
                ephemeral: false,
                time: 40000,
                disableButtons: true,
                fastSkip: false,
                pageTravel: false,
                buttons: [
                    {
                        type: ButtonTypes.previous,
                        label: 'Previous Node',
                        style: ButtonStyles.Primary
                    },
                    {
                        type: ButtonTypes.next,
                        label: 'Next Node',
                        style: ButtonStyles.Success
                    }
                ]
            })
        }

        return interaction.reply({
            embeds: [
                new client.Gateway.EmbedBuilder()
                    .setTitle('Error')
                    .setColor(client.colors.error)
                    .setDescription('An error occurred while fetching the nodes.')
                    .setTimestamp()
                    .setFooter({
                        text: client.footer,
                        iconURL: client.logo
                    })
            ]
        })
    }
}
