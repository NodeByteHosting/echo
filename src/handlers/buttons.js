import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { log } from '../functions/logger.js'

export const createButtons = labels => {
    const buttonConfigs = [
        { customId: 'previous', label: labels.previous, style: ButtonStyle.Primary },
        { customId: 'next', label: labels.next, style: ButtonStyle.Success },
        { customId: 'close', label: labels.close, style: ButtonStyle.Danger }
    ]

    const buttons = buttonConfigs.map(config => {
        return new ButtonBuilder().setCustomId(config.customId).setLabel(config.label).setStyle(config.style)
    })

    return new ActionRowBuilder().addComponents(buttons)
}

export const handleButtonInteractions = (interaction, embeds, updateReply) => {
    let currentPage = 0

    const filter = i => i.customId === 'previous' || i.customId === 'next' || i.customId === 'close'
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 })

    collector.on('collect', async i => {
        if (i.customId === 'previous') {
            currentPage = currentPage === 0 ? embeds.length - 1 : currentPage - 1
        } else if (i.customId === 'next') {
            currentPage = currentPage === embeds.length - 1 ? 0 : currentPage + 1
        } else if (i.customId === 'close') {
            try {
                await interaction.deleteReply()
            } catch (error) {
                log(`An error occurred while deleting the reply: ${error.message}`, 'error')
                log(`Stack Trace: ${error.stack}`, 'error')
            }
            return
        }
        await i.deferUpdate()
        await updateReply(currentPage)
    })

    collector.on('end', async () => {
        await interaction.editReply({ components: [] })
    })
}
