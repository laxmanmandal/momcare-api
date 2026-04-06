import prisma from '../prisma/client'
export async function handleReaction({ userId, postId, commentId }: any) {
    const existing = await prisma.reaction.findFirst({
        where: { userId, postId, commentId }
    });

    if (existing) {
        if (existing.type === "LIKE") {
            // ✅ double reaction → delete
            await prisma.reaction.delete({ where: { id: existing.id } });
            return { message: "Reaction removed", data: null };
        }

        // ✅ update reaction type
    }

    // ✅ create new reaction
    const created = await prisma.reaction.create({
        data: { userId, postId, commentId }
    });

    return { message: "Reaction added", data: created };
}

export async function getReaction(postId?: number, commentId?: number) {
    if (!postId && !commentId) {
        throw new Error('postId or commentId is required');
    }

    return prisma.reaction.findMany({
        where: {
            ...(postId ? { postId } : {}),
            ...(commentId ? { commentId } : {}),
            type: 'LIKE'
        },
        select: {
            User: {
                select: {
                    name: true,
                    imageUrl: true
                }
            }
        },
        orderBy: {
            created_at: 'desc'
        }
    });
}

