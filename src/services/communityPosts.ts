import { PostType, Prisma } from '@prisma/client';
import prisma from '../prisma/client'
import { deleteFileIfExists } from '../utils/fileUploads'

// ================= HELPER =================
function toValidInt(v: unknown): number | undefined {
    if (v === undefined || v === null) return undefined;
    const n = Number(v);
    return Number.isInteger(n) ? n : undefined;
}

function buildReactionCounts(reactions: { type: string }[]) {
    const counts: Record<string, number> = {};
    for (const r of reactions) {
        counts[r.type] = (counts[r.type] || 0) + 1;
    }
    return counts;
}

// ================= GET ALL =================
export async function getCommunityPost() {
    return prisma.communityPost.findMany({
        orderBy: { created_at: "desc" },
        include: baseInclude()
    });
}

// ================= GET BY TYPE =================
export async function getPostByType(type: PostType) {
    const posts = await prisma.communityPost.findMany({
        where: { type },
        orderBy: { created_at: "desc" },
        include: baseInclude()
    });

    return posts.map(post => ({
        ...post,
        reactionCounts: buildReactionCounts(post.Reaction),
        userReaction: null
    }));
}

// ================= GET BY USER =================
export async function getPostByUser(userId?: number) {
    const posts = await prisma.communityPost.findMany({
        orderBy: { created_at: "desc" },
        include: {
            ...baseInclude(),
            Reaction: {
                select: {
                    type: true,
                    userId: true
                }
            }
        }
    });

    return posts.map(post => ({
        ...post,
        reactionCounts: buildReactionCounts(post.Reaction),
        userReaction: userId
            ? post.Reaction.find(r => r.userId === userId)?.type || null
            : null
    }));
}

// ================= GET SINGLE =================
export async function getCommunityPostById(id: number) {
    return prisma.communityPost.findUnique({
        where: { id },
        include: baseInclude()
    });
}

// ================= GET BY COMMUNITY =================
export async function getPostByCommunityId(communityId: number) {
    return prisma.communityPost.findMany({
        where: { communityId },
        include: baseInclude()
    });
}

// ================= CREATE =================
export async function createCommunityPost(
    data: Prisma.CommunityPostUncheckedCreateInput
) {
    return prisma.communityPost.create({ data });
}

// ================= UPDATE =================
export async function updateCommunityPost(
    id: unknown,
    payload: Prisma.CommunityPostUncheckedUpdateInput
) {
    const postId = toValidInt(id);
    if (!postId) throw new Error('Invalid post id');

    const existing = await prisma.communityPost.findUnique({
        where: { id: postId },
        select: { id: true, media: true }
    });

    if (!existing) throw new Error('CommunityPost not found');

    const updated = await prisma.communityPost.update({
        where: { id: postId },
        data: payload
    });

    // delete old media safely
    try {
        const nextMedia = typeof payload.media === 'string' ? payload.media : undefined;
        if (nextMedia && existing.media && existing.media !== nextMedia) {
            await deleteFileIfExists(existing.media);
        }
    } catch (err) {
        console.error('Media delete failed:', err);
    }

    return updated;
}

// ================= SHARE =================
export async function incrementShareCount(id: unknown) {
    const postId = toValidInt(id);
    if (!postId) throw new Error('Invalid post id');

    return prisma.communityPost.update({
        where: { id: postId },
        data: { shareCount: { increment: 1 } },
        select: { id: true, shareCount: true }
    });
}

// ================= VIEW =================
export async function incrementViewCount(id: unknown) {
    const postId = toValidInt(id);
    if (!postId) throw new Error('Invalid post id');

    return prisma.communityPost.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
        select: { id: true, viewCount: true }
    });
}

// ================= STATUS =================
export async function communityPostStatus(id: number) {
    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw new Error("Community Post not found");

    return prisma.communityPost.update({
        where: { id },
        data: { isActive: !post.isActive }
    });
}

// ================= COMMON INCLUDE =================
function baseInclude() {
    return {
        Reaction: {
            select: { type: true }
        },
        _count: {
            select: {
                Reaction: true,
                comments: true
            }
        },
        community: {
            select: {
                id: true,
                name: true
            }
        },
        user: {
            select: {
                id: true,
                name: true
            }
        }
    };
}
