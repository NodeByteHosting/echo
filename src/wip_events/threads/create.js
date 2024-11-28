import { Events } from 'discord.js'
import { log, baseLog } from '../../functions/logger.js'
import { syncPost } from '../../database/posts/sync.js'
import { addPoints } from '../../database/users/addPoints.js'
import { isThreadInForumChannel, isThreadSupported } from '../../functions/threads.js'

export default {
    event: Events.ThreadCreate,

    run: async (_, client, thread) => {
        if (!isThreadInForumChannel(thread) || !isThreadSupported(thread)) {
            return
        }

        try {
            await syncPost({ client, thread })
            baseLog('Created a new Post and Thread (%s)', thread.id)

            if (thread.ownerId) {
                await addPoints(thread.ownerId, 'question')
            }

            await thread.send({
                embeds: [
                    new client.Gateway.EmbedBuilder()
                        .setTitle('Post Created!')
                        .setUrl(`${process.env.WEB_URL}/post/${thread.id}`)
                        .setColor(client.colors.primary)
                        .setThumbnail(client.logo)
                        .setDescription(
                            dedent`
                            🔎 **Your post has been indexed in our web forum!**
                            This means it will be visible to search engines, allowing other users to find it outside of Discord.

                            🕵️ **Your profile is private by default.**
                            It won't be visible in our web forum to users outside of Discord. If you want to make your profile public, you can add the "Public Profile" role in <id:customize>.

                            ✅ **Mark a message as the answer.**
                            If you feel like someone has provided a positive solution to your question you can mark a message as the answer to your post by using \`Right click -> Apps -> Mark Solution\`. If you don't see the option, try refreshing Discord with \`Ctrl + R\`.
                        `
                        )
                        .setTimestamp()
                        .setFooter({
                            text: client.footer,
                            iconURL: client.logo
                        })
                ]
            })
        } catch (err) {
            log(`failed to create thread: ${err.message}`, 'error')
            baseLog(`error stack:`, err.stack)
        }
    }
}
