/**
 * Service for managing typing indicators in Discord
 */
export class TypingService {
    constructor() {
        this.activeTypingTimers = new Map()
        this.typingInterval = 5000 // Discord typing lasts ~10 seconds, refresh every 5s
    }

    /**
     * Start typing in a channel
     * @param {TextChannel} channel - The Discord channel
     * @returns {Object} Typing controller with stop method
     */
    startTyping(channel) {
        if (!channel || !channel.sendTyping) {
            console.warn('Invalid channel provided for typing indicator')
            return { stop: () => {} }
        }

        const channelId = channel.id

        // Clear any existing typing timer for this channel
        if (this.activeTypingTimers.has(channelId)) {
            clearInterval(this.activeTypingTimers.get(channelId).timer)
        }

        // Start typing immediately
        channel.sendTyping().catch(err => {
            console.warn(`Error sending typing indicator: ${err.message}`)
        })

        // Create interval to keep typing indicator active
        let active = true
        const timer = setInterval(() => {
            if (!active) {
                clearInterval(timer)
                return
            }

            channel.sendTyping().catch(err => {
                console.warn(`Error refreshing typing indicator: ${err.message}`)
                // If we can't send typing anymore, stop the timer
                if (err.code === 10003 || err.code === 50001) {
                    // Unknown Channel or Missing Access
                    active = false
                    clearInterval(timer)
                }
            })
        }, this.typingInterval)

        // Store the timer and controller
        const controller = {
            stop: () => {
                active = false
                clearInterval(timer)
                this.activeTypingTimers.delete(channelId)
            }
        }

        this.activeTypingTimers.set(channelId, {
            timer,
            controller,
            startTime: Date.now()
        })

        return controller
    }

    /**
     * Stop typing in a channel
     * @param {string} channelId - The Discord channel ID
     */
    stopTyping(channelId) {
        if (this.activeTypingTimers.has(channelId)) {
            const { controller } = this.activeTypingTimers.get(channelId)
            controller.stop()
        }
    }

    /**
     * Stop all active typing indicators
     */
    stopAll() {
        for (const [channelId, { controller }] of this.activeTypingTimers.entries()) {
            controller.stop()
        }
        this.activeTypingTimers.clear()
    }

    /**
     * Get typing statistics
     * @returns {Object} Typing statistics
     */
    getStats() {
        const now = Date.now()
        const stats = {
            activeChannels: this.activeTypingTimers.size,
            channels: []
        }

        for (const [channelId, { startTime }] of this.activeTypingTimers.entries()) {
            stats.channels.push({
                channelId,
                duration: now - startTime
            })
        }

        return stats
    }
}
