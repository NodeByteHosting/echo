const START_INDEXING_AFTER = 1686438000000

/**
 * Check if the message is part of a indexed forum channel
 */
export const isMessageInForumChannel = async (client, channel) => {
    const dbChannel = await client.db.prisma.channel.findUnique({ where: { id: channel.parentId } })

    if (!dbChannel) {
        return false
    }

    return channel.isThread() && channel.parentId !== null && dbChannel.indexed === true
}

/**
 * Check if the message is supported for indexing
 */
export const isMessageSupported = message => {
    const isIndexable = message.createdAt.getTime() > START_INDEXING_AFTER
    return !message.author.bot && !message.system && isIndexable
}

export const isThreadSupported = thread => {
    const isIndexable = thread.createdAt !== null && thread.createdAt.getTime() > START_INDEXING_AFTER

    /** can ignore archived threads as well using
     * `!thread.archived && isIndexable`
     */
    return isIndexable
}

/**
 * Check if the thread is in a indexed forum channel
 */
export const isThreadInForumChannel = async (client, thread) => {
    const channel = await client.db.prisma.channel.findUnique({ where: { id: thread.parentId } })

    if (!channel) {
        return false
    }

    return thread.parentId !== null && channel.indexed === true
}
