/**
 * Service for handling message responses
 */
export class ResponseService {
    /**
     * Send response optimized for speed
     * @param {Message} message - Original Discord message
     * @param {string} content - Response content
     */
    async sendResponse(message, content) {
        // For very long responses, consider chunking
        if (content.length > 4000) {
            await this.sendLongResponse(message, content)
            return
        }

        // Send normal response
        try {
            await message.reply({ content })
        } catch (err) {
            console.error('Failed to send response:', err)
            // Simplified fallback
            message
                .reply({
                    content: 'I encountered an issue with sending my response. Please try again.'
                })
                .catch(() => {})
        }
    }

    /**
     * Send a long response in chunks for faster initial display
     * @param {Message} message - Original Discord message
     * @param {string} content - Long response content
     */
    async sendLongResponse(message, content) {
        try {
            // First send a quick initial response
            const firstChunk = content.substring(0, 1800) + '...'
            const initialResponse = await message.reply({ content: firstChunk })

            // Then split the rest into chunks
            const chunks = this.splitResponseIntoChunks(content, 1900)

            // Send the rest as follow-ups, but skip the first chunk we already sent
            for (let i = 1; i < chunks.length; i++) {
                await message.channel.send({ content: chunks[i] })
            }
        } catch (error) {
            console.error('Error sending long response:', error)
            message
                .reply({
                    content: 'I created a detailed response but encountered an issue sending it. Please try again.'
                })
                .catch(() => {})
        }
    }

    /**
     * Split a response into appropriate chunks
     * @param {string} content - Response content
     * @param {number} maxLength - Maximum chunk length
     * @returns {Array<string>} Array of content chunks
     */
    splitResponseIntoChunks(content, maxLength = 1900) {
        const chunks = []

        // Special handling for code blocks
        const parts = content.split(/(```[\s\S]*?```)/)
        let currentChunk = ''

        for (const part of parts) {
            // If this is a code block
            if (part.startsWith('```') && part.endsWith('```')) {
                if (currentChunk.length + part.length > maxLength) {
                    // Code block doesn't fit in current chunk
                    if (currentChunk) {
                        chunks.push(currentChunk)
                    }

                    // If code block is larger than max length, split it
                    if (part.length > maxLength) {
                        const language = part.match(/```(\w+)?/)?.[1] || ''
                        const code = part.replace(/```(\w+)?\n?/, '').replace(/```$/, '')

                        // Split code by lines
                        const lines = code.split('\n')
                        let codeChunk = '```' + language + '\n'

                        for (const line of lines) {
                            if (codeChunk.length + line.length + 4 > maxLength) {
                                chunks.push(codeChunk + '```')
                                codeChunk = '```' + language + '\n' + line + '\n'
                            } else {
                                codeChunk += line + '\n'
                            }
                        }

                        if (codeChunk !== '```' + language + '\n') {
                            chunks.push(codeChunk + '```')
                        }
                    } else {
                        chunks.push(part)
                    }

                    currentChunk = ''
                } else {
                    currentChunk += part
                }
            }
            // For regular text
            else {
                const sentences = part.split(/(?<=\.|\?|\!)\s+/)

                for (const sentence of sentences) {
                    if (currentChunk.length + sentence.length > maxLength) {
                        chunks.push(currentChunk)
                        currentChunk = sentence
                    } else {
                        currentChunk += (currentChunk && !currentChunk.endsWith(' ') ? ' ' : '') + sentence
                    }
                }
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk)
        }

        return chunks
    }
}
