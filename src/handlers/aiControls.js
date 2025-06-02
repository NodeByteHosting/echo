import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { aiService } from '../services/ai.service.js'
import { createResponseControls } from '../components/responseControls.js'

export async function handleAIControls(interaction) {
    if (!interaction.isButton()) {
        return false
    }

    const customId = interaction.customId
    if (!customId.startsWith('ai_')) {
        return false
    }

    // Acknowledge the interaction immediately for better UX
    await interaction.deferUpdate().catch(() => {})

    try {
        // Get the message that contains the button
        const message = interaction.message
        const originalMessage = message.reference ? await message.fetchReference().catch(() => null) : null

        if (!originalMessage && !['ai_clear', 'ai_save'].includes(customId)) {
            await interaction.followUp({
                content: "I couldn't find the original message to regenerate or refine the response.",
                ephemeral: true
            })
            return true
        }

        switch (customId) {
            case 'ai_regenerate':
                await handleRegenerate(interaction, message, originalMessage)
                break

            case 'ai_refine':
                await handleRefine(interaction, message, originalMessage)
                break

            case 'ai_clear':
                await handleClearHistory(interaction)
                break

            case 'ai_save':
                await handleSaveResponse(interaction, message)
                break
        }

        return true
    } catch (error) {
        console.error('Error handling AI control:', error)

        // Provide feedback even if there's an error
        await interaction
            .followUp({
                content: 'I encountered an error processing your request.',
                ephemeral: true
            })
            .catch(() => {})

        return true
    }
}

async function handleRegenerate(interaction, message, originalMessage) {
    // Start typing to show activity
    await interaction.channel.sendTyping().catch(() => {})

    try {
        // Get the regenerated response
        const response = await aiService.regenerateResponse(originalMessage)

        // Edit the original response with the new content
        await message.edit({
            content: response.content,
            components: [createResponseControls()]
        })
    } catch (error) {
        console.error('Error regenerating response:', error)
        await interaction.followUp({
            content: "I couldn't regenerate the response. Please try again.",
            ephemeral: true
        })
    }
}

async function handleRefine(interaction, message, originalMessage) {
    // Prompt the user for refinement instructions
    await interaction.followUp({
        content: 'How would you like me to refine my response? Please provide specific instructions.',
        ephemeral: true
    })

    // Set up a message collector to wait for their refinement instructions
    const filter = m => m.author.id === interaction.user.id
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 })

    collector.on('collect', async refinementMsg => {
        collector.stop()

        // Let the user know we're processing
        await interaction.channel.sendTyping().catch(() => {})

        try {
            // Get the refined response
            const response = await aiService.regenerateResponse(originalMessage, {
                refinement: refinementMsg.content
            })

            // Edit the original response with the refined content
            await message.edit({
                content: response.content,
                components: [createResponseControls()]
            })

            // Delete the refinement message to keep the chat clean
            await refinementMsg.delete().catch(() => {})
        } catch (error) {
            console.error('Error refining response:', error)
            await refinementMsg.reply("I couldn't refine the response. Please try again.")
        }
    })
}

async function handleClearHistory(interaction) {
    try {
        // Clear the user's conversation history
        await aiService.clearUserHistory(interaction.user.id)

        await interaction.followUp({
            content: "I've cleared your conversation history. We're starting with a clean slate!",
            ephemeral: true
        })
    } catch (error) {
        console.error('Error clearing history:', error)
        await interaction.followUp({
            content: "I couldn't clear your conversation history. Please try again.",
            ephemeral: true
        })
    }
}

async function handleSaveResponse(interaction, message) {
    try {
        // Save the response to the knowledge base
        await aiService.saveToKnowledgeBase(message, interaction.user.id)

        await interaction.followUp({
            content: "I've saved this response to the knowledge base for future reference!",
            ephemeral: true
        })
    } catch (error) {
        console.error('Error saving response:', error)
        await interaction.followUp({
            content: "I couldn't save this response to the knowledge base. Please try again.",
            ephemeral: true
        })
    }
}
