import { revalidateHomepage } from '../../functions/revalidate'

export const syncPost = async ({ client, thread }) => {
    const now = new Date()

    await client.db.prisma.post.upsert({
        where: { id: thread.id },
        update: {
            title: thread.name,
            editedAt: now,
            isLocked: Boolean(thread.locked),
            lastActiveAt: now,
            editedAt: now,
            isLocked: Boolean(thread.locked),
            lastActive: now,
            channelId: { connect: { id: thread.channelId } }
        },
        create: {
            id: thread.id,
            owner: { connect: { id: thread.ownerId } },
            editedAt: now,
            isLocked: Boolean(thread.locked),
            createdAt: thread.createdAt ?? now,
            editedAt: thread.createdAt ?? now,
            lastActive: now,
            channelId: { connect: { id: thread.channelId } }
        }
    })
}
