/**
 * Service for managing typing indicators
 */
export class TypingService {
    /**
     * Start a typing indicator with automatic refresh
     * @param {TextChannel} channel - Discord text channel
     * @returns {Object} Typing controller with stop method
     */
    startTyping(channel) {
        let active = true

        const typingInterval = setInterval(() => {
            if (active) {
                channel.sendTyping().catch(() => {})
            } else {
                clearInterval(typingInterval)
            }
        }, 5000)

        // Start typing immediately
        channel.sendTyping().catch(() => {})

        return {
            stop: () => {
                active = false
                clearInterval(typingInterval)
            }
        }
    }
}
