import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

export function createResponseControls() {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ai_regenerate').setLabel('🔄 Regenerate').setStyle(ButtonStyle.Primary),

        new ButtonBuilder().setCustomId('ai_refine').setLabel('📝 Refine').setStyle(ButtonStyle.Secondary),

        new ButtonBuilder().setCustomId('ai_clear').setLabel('🗑️ Clear History').setStyle(ButtonStyle.Danger),

        new ButtonBuilder().setCustomId('ai_save').setLabel('💾 Save Response').setStyle(ButtonStyle.Success)
    )

    return row
}
