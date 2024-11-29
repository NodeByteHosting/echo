import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js'
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
                console.error('Error:', err.stack)
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

                return new EmbedBuilder()
                    .setTitle(attr.name === 'ThunderDuck-MC-EU' ? 'Node: DEDI-MC-US-01' : 'Node: DEDI-MC-GER-01')
                    .setColor('#0099ff')
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

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('previous').setLabel('Previous Node').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('next').setLabel('Next Node').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('close').setLabel('Close').setStyle(ButtonStyle.Danger)
            )

            let currentPage = 0

            const updateReply = async () => {
                await interaction.editReply({
                    embeds: [embeds[currentPage]],
                    components: [row]
                })
            }

            await updateReply()

            const filter = i => i.customId === 'previous' || i.customId === 'next' || i.customId === 'close'
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 })

            collector.on('collect', async i => {
                if (i.customId === 'previous') {
                    currentPage = currentPage === 0 ? embeds.length - 1 : currentPage - 1
                } else if (i.customId === 'next') {
                    currentPage = currentPage === embeds.length - 1 ? 0 : currentPage + 1
                } else if (i.customId === 'close') {
                    await interaction.deleteReply()
                    return
                }
                await i.deferUpdate()
                await updateReply()
            })

            collector.on('end', async () => {
                await interaction.editReply({ components: [] })
            })
        } else {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Error')
                        .setColor('#ff0000')
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
}
