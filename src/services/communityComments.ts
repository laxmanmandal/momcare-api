import prisma from '../prisma/client'

export async function getComments() {
    return prisma.comment.findMany();
}

/* Fetch all comments of a post (flat) */
export async function getCommentsByPostId(postId: number) {
    return prisma.comment.findMany({
        where: { postId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    imageUrl: true
                }
            },
            _count: {
                select: {
                    Reaction: true,   // 👈 likes count
                    replies: true
                }
            }
        },
        orderBy: { created_at: 'desc' }
    });
}

/* Convert flat list to nested tree */
function nestComments(comments: any[]) {
    const map = new Map<number, any>();
    const roots: any[] = [];

    comments.forEach(c =>
        map.set(c.id, { ...c, replies: [] })
    );

    comments.forEach(c => {
        if (c.parentId) {
            map.get(c.parentId)?.replies.push(map.get(c.id));
        } else {
            roots.push(map.get(c.id));
        }
    });

    return roots;
}

/* Public function used by routes */
export async function getNestedComments(postId: number) {
    const comments = await getCommentsByPostId(postId);
    return nestComments(comments);
}





export async function createComment(data: any) {
    return prisma.comment.create({ data })
}

export async function updateComment(id: any, data: any) {
    const existing = await prisma.comment.findUnique({ where: { id } })
    if (!existing) throw new Error('community comment not found')
    return prisma.comment.update({ where: { id }, data })
}

export async function CommentStatus(id: number) {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new Error("Community comment not found");

    return prisma.comment.update({
        where: { id },
        data: { isActive: !comment.isActive },
    });
}


// comments reply 
