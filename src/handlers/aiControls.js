import { aiService } from '../services/ai.service.js'
import { createResponseControls } from '../components/responseControls.js'

export async function handleAIControls(interaction) {
    // Only handle AI control buttons
    if (!interaction.customId.startsWith('ai_')) {
        return false
    }

    await interaction.deferUpdate()

    const originalMessage = interaction.message
    const action = interaction.customId.replace('ai_', '')

    try {
        switch (action) {
            case 'regenerate': {
                // Get the original message that triggered the AI
                const originalContent = originalMessage.reference
                    ? (await originalMessage.fetchReference()).content
                    : originalMessage.content

                // Regenerate the response
                const response = await aiService.regenerateResponse(originalContent, interaction.user.id)

                // Format response content
                const formattedResponse = Array.isArray(response.content) ? response.content : [response.content]

                // Update the message with new response
                await originalMessage.edit({
                    content: formattedResponse[0],
                    components: [createResponseControls()]
                })

                // Send additional messages if needed
                for (let i = 1; i < formattedResponse.length; i++) {
                    await interaction.channel.send({
                        content: formattedResponse[i],
                        components: i === formattedResponse.length - 1 ? [createResponseControls()] : []
                    })
                }
                break
            }

            case 'refine': {
                await interaction.channel.send({
                    content: `<@${interaction.user.id}> Reply to this message with how you'd like me to refine my response.`,
                    components: []
                })
                break
            }

            case 'clear': {
                await aiService.clearUserHistory(interaction.user.id)
                await interaction.channel.send({
                    content: `<@${interaction.user.id}> I've cleared our conversation history.`,
                    components: []
                })
                break
            }

            case 'save': {
                try {
                    await aiService.saveToKnowledgeBase(originalMessage, interaction.user.id)
                    await interaction.channel.send({
                        content: `<@${interaction.user.id}> Response saved to knowledge base!`,
                        components: []
                    })
                } catch (error) {
                    console.error('Failed to save to knowledge base:', error)
                    await interaction.channel.send({
                        content: `<@${interaction.user.id}> Sorry, I couldn't save that to the knowledge base. Please try again later.`,
                        components: []
                    })
                }
                break
            }
        }

        return true
    } catch (error) {
        console.error('Error handling AI control button:', error)
        await interaction.channel.send({
            content: `<@${interaction.user.id}> Sorry, I encountered an error processing that action. Please try again.`,
            components: []
        })
        return true
    }
}
