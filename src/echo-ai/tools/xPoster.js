import { TwitterApi } from 'twitter-api-v2'
import { log } from '#functions/logger.js'

/**
 * Service for posting updates to X (Twitter)
 */
export class XPoster {
    constructor() {
        this.client = null
        this.initialized = false
        this.rateLimit = {
            tweets: {
                limit: 50, // Maximum tweets per 24 hours
                window: 24 * 60 * 60 * 1000, // 24 hours in ms
                remaining: 50,
                reset: Date.now() + 24 * 60 * 60 * 1000
            },
            media: {
                limit: 4, // Maximum media per tweet
                window: 3 * 60 * 60 * 1000, // 3 hours for media heavy requests
                remaining: 4,
                reset: Date.now() + 3 * 60 * 60 * 1000
            }
        }
        this.history = []
        this.scheduleQueue = []
        this.init()
    }

    /**
     * Initialize the Twitter client
     */
    async init() {
        try {
            const apiKey = process.env.TWITTER_API_KEY
            const apiKeySecret = process.env.TWITTER_API_SECRET
            const accessToken = process.env.TWITTER_ACCESS_TOKEN
            const accessTokenSecret = process.env.TWITTER_ACCESS_SECRET

            if (!apiKey || !apiKeySecret || !accessToken || !accessTokenSecret) {
                log('Twitter API credentials not properly configured', 'warn')
                return
            }

            this.client = new TwitterApi({
                appKey: apiKey,
                appSecret: apiKeySecret,
                accessToken: accessToken,
                accessSecret: accessTokenSecret
            })

            // Verify credentials
            await this.client.v2.me()
            this.initialized = true
            log('Twitter API client initialized successfully', 'info')

            // Setup scheduled tweet processor
            this._setupScheduledTweetProcessor()
        } catch (error) {
            log('Failed to initialize Twitter client', 'error', error)
        }
    }

    /**
     * Post a tweet to X
     * @param {Object} options Tweet options
     * @param {string} options.text The tweet text
     * @param {Array<string>} [options.mediaIds] Optional array of media IDs to attach
     * @param {string} [options.replyToTweetId] Optional tweet ID to reply to
     * @param {boolean} [options.sensitive] Whether the content is sensitive
     * @returns {Promise<Object>} The tweet data
     */
    async postTweet(options) {
        if (!this.initialized) {
            throw new Error('Twitter client not initialized')
        }

        // Check rate limits
        if (!this._checkRateLimit('tweets')) {
            throw new Error('Tweet rate limit exceeded. Try again later.')
        }

        try {
            // Ensure text is within the 280 character limit
            if (options.text.length > 280) {
                options.text = options.text.substring(0, 277) + '...'
            }

            // Create tweet
            const tweet = await this.client.v2.tweet(options.text, {
                media: options.mediaIds ? { media_ids: options.mediaIds } : undefined,
                reply: options.replyToTweetId ? { in_reply_to_tweet_id: options.replyToTweetId } : undefined,
                possibly_sensitive: options.sensitive || false
            })

            // Update rate limit
            this.rateLimit.tweets.remaining--

            // Add to history
            this.history.push({
                id: tweet.data.id,
                text: options.text,
                timestamp: Date.now(),
                success: true
            })

            log('Tweet posted successfully', 'info', { tweetId: tweet.data.id })
            return tweet.data
        } catch (error) {
            // Handle rate limit error from Twitter
            if (error.code === 429) {
                this.rateLimit.tweets.remaining = 0
                // Parse reset time from headers if available
                if (error.rateLimit) {
                    this.rateLimit.tweets.reset = error.rateLimit.reset * 1000 // Convert to ms
                }
            }

            // Add failed attempt to history
            this.history.push({
                text: options.text,
                timestamp: Date.now(),
                success: false,
                error: error.message
            })

            log('Failed to post tweet', 'error', error)
            throw error
        }
    }

    /**
     * Upload media to Twitter
     * @param {Buffer|string} media The media buffer or filepath
     * @param {string} mediaType The MIME type of the media
     * @returns {Promise<string>} The media ID
     */
    async uploadMedia(media, mediaType) {
        if (!this.initialized) {
            throw new Error('Twitter client not initialized')
        }

        // Check media rate limits
        if (!this._checkRateLimit('media')) {
            throw new Error('Media upload rate limit exceeded. Try again later.')
        }

        try {
            // Use v1 client for media upload
            const mediaId = await this.client.v1.uploadMedia(media, { mimeType: mediaType })

            // Update rate limit
            this.rateLimit.media.remaining--

            log('Media uploaded successfully', 'info', { mediaId })
            return mediaId
        } catch (error) {
            log('Failed to upload media', 'error', error)
            throw error
        }
    }

    /**
     * Schedule a tweet for later posting
     * @param {Object} tweetOptions The tweet options
     * @param {Date} scheduledTime When to post the tweet
     * @returns {Object} The scheduled tweet information
     */
    schedulePost(tweetOptions, scheduledTime) {
        if (scheduledTime <= new Date()) {
            throw new Error('Scheduled time must be in the future')
        }

        const scheduledId = Date.now().toString()
        const scheduledTweet = {
            id: scheduledId,
            options: tweetOptions,
            scheduledTime: scheduledTime.getTime(),
            created: Date.now()
        }

        this.scheduleQueue.push(scheduledTweet)
        this._sortScheduleQueue()

        log('Tweet scheduled', 'info', {
            id: scheduledId,
            text: tweetOptions.text.substring(0, 30) + '...',
            scheduledTime
        })

        return {
            id: scheduledId,
            scheduledTime
        }
    }

    /**
     * Cancel a scheduled tweet
     * @param {string} scheduleId The ID of the scheduled tweet
     * @returns {boolean} Whether the tweet was successfully canceled
     */
    cancelScheduledPost(scheduleId) {
        const initialLength = this.scheduleQueue.length
        this.scheduleQueue = this.scheduleQueue.filter(item => item.id !== scheduleId)

        const canceled = initialLength > this.scheduleQueue.length
        if (canceled) {
            log('Scheduled tweet canceled', 'info', { scheduleId })
        } else {
            log('Failed to cancel scheduled tweet - not found', 'warn', { scheduleId })
        }

        return canceled
    }

    /**
     * Get all scheduled tweets
     * @returns {Array} List of scheduled tweets
     */
    getScheduledPosts() {
        return this.scheduleQueue.map(item => ({
            id: item.id,
            text: item.options.text,
            scheduledTime: new Date(item.scheduledTime),
            created: new Date(item.created)
        }))
    }

    /**
     * Get recent tweet history
     * @param {number} limit Maximum number of items to return
     * @returns {Array} List of recent tweets
     */
    getHistory(limit = 10) {
        return this.history
            .slice(-limit)
            .reverse()
            .map(item => ({
                ...item,
                timestamp: new Date(item.timestamp)
            }))
    }

    /**
     * Check if we've hit rate limits
     * @param {string} type The type of limit to check
     * @returns {boolean} Whether we can proceed
     * @private
     */
    _checkRateLimit(type) {
        const limit = this.rateLimit[type]

        // Reset if the window has passed
        if (Date.now() > limit.reset) {
            limit.remaining = limit.limit
            limit.reset = Date.now() + limit.window
        }

        return limit.remaining > 0
    }

    /**
     * Sort the schedule queue by time
     * @private
     */
    _sortScheduleQueue() {
        this.scheduleQueue.sort((a, b) => a.scheduledTime - b.scheduledTime)
    }

    /**
     * Process scheduled tweets
     * @private
     */
    _setupScheduledTweetProcessor() {
        // Check every minute for tweets to post
        setInterval(async () => {
            const now = Date.now()
            const tweetsToPost = []

            // Find tweets that are due
            while (this.scheduleQueue.length > 0 && this.scheduleQueue[0].scheduledTime <= now) {
                tweetsToPost.push(this.scheduleQueue.shift())
            }

            // Post each tweet
            for (const tweet of tweetsToPost) {
                try {
                    await this.postTweet(tweet.options)
                    log('Scheduled tweet posted', 'info', { scheduleId: tweet.id })
                } catch (error) {
                    log('Failed to post scheduled tweet', 'error', {
                        scheduleId: tweet.id,
                        error: error.message
                    })

                    // If rate limited, re-schedule for later
                    if (error.code === 429) {
                        const rescheduleTime = new Date(this.rateLimit.tweets.reset + 60000) // Add a minute buffer
                        this.schedulePost(tweet.options, rescheduleTime)
                        log('Rate limited tweet rescheduled', 'warn', {
                            scheduleId: tweet.id,
                            newTime: rescheduleTime
                        })
                    }
                }
            }
        }, 60000) // Check every minute
    }
}

// Create a singleton instance
let instance = null

/**
 * Get the XPoster instance
 * @returns {XPoster} The XPoster instance
 */
export function getXPoster() {
    if (!instance) {
        instance = new XPoster()
    }
    return instance
}
