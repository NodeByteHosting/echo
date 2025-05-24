export class MessageFormattingTool {
    formatForDiscord(response) {
        // If response is within Discord's limit, return as is
        if (response.length <= 1900) {
            return response
        }

        return this.smartSplit(response)
    }

    smartSplit(response) {
        const parts = []
        const maxLength = 1900 // Leave room for part numbers

        // First, split by code blocks to preserve them
        const blocks = response.split(/(```[\s\S]*?```)/)
        let currentPart = ''

        for (const block of blocks) {
            // If it's a code block, try to add it whole or make it a separate part
            if (block.startsWith('```')) {
                if (currentPart.length + block.length > maxLength) {
                    if (currentPart.trim()) {
                        parts.push(currentPart.trim())
                    }
                    parts.push(block)
                    currentPart = ''
                } else {
                    currentPart += (currentPart ? '\n' : '') + block
                }
                continue
            }

            // For regular text, split by paragraphs first
            const paragraphs = block.split(/\n\s*\n/)

            for (const paragraph of paragraphs) {
                if (currentPart.length + paragraph.length + 2 <= maxLength) {
                    currentPart += (currentPart ? '\n\n' : '') + paragraph
                    continue
                }

                // If paragraph is too long, split by sentences
                if (paragraph.length > maxLength) {
                    const sentences = paragraph.split(/([.!?]+\s+)/)

                    for (const sentence of sentences) {
                        if (currentPart.length + sentence.length > maxLength) {
                            if (currentPart.trim()) {
                                parts.push(currentPart.trim())
                            }
                            currentPart = sentence
                        } else {
                            currentPart += sentence
                        }
                    }
                } else {
                    if (currentPart.trim()) {
                        parts.push(currentPart.trim())
                    }
                    currentPart = paragraph
                }
            }
        }

        if (currentPart.trim()) {
            parts.push(currentPart.trim())
        }

        // Add part numbers to each part
        return parts.map((part, i) => `[Part ${i + 1}/${parts.length}]\n${part}`)
    }
}
