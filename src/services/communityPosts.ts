import { PostType, Prisma } from '@prisma/client';
import prisma from '../prisma/client'
import { deleteFileIfExists } from '../utils/fileUploads'

type CommunityPostListQuery = {
    search?: string;
    type?: PostType;
    communityId?: number;
    userId?: number;
    mediaType?: string;
    featured?: boolean;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortField?: 'id' | 'title' | 'type' | 'featured' | 'isActive' | 'created_at' | 'updated_at' | 'viewCount' | 'shareCount';
    sortOrder?: 'asc' | 'desc';
}

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

function buildCommunityPostWhere(query: CommunityPostListQuery) {
    const where: Prisma.CommunityPostWhereInput = {};

    if (query.search) {
        where.OR = [
            { title: { contains: query.search } },
            { content: { contains: query.search } },
            { mediaType: { contains: query.search } },
            { community: { name: { contains: query.search } } },
            { user: { name: { contains: query.search } } },
        ];
    }

    if (query.type) where.type = query.type;
    if (query.communityId !== undefined) where.communityId = query.communityId;
    if (query.userId !== undefined) where.userId = query.userId;
    if (query.mediaType) where.mediaType = query.mediaType;
    if (query.featured !== undefined) where.featured = query.featured;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return where;
}

function paginationFrom(query: CommunityPostListQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    return { page, limit, skip: (page - 1) * limit };
}

function toListResponse(posts: any[], total: number, page: number, limit: number) {
    return {
        data: posts.map(post => ({
            ...post,
            reactionCounts: buildReactionCounts((post as any).Reaction ?? []),
            userReaction: null
        })),
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}

// ================= GET ALL =================
export async function getCommunityPost(query: CommunityPostListQuery = {}) {
    const { page, limit, skip } = paginationFrom(query);
    const where = buildCommunityPostWhere(query);
    const sortField = query.sortField ?? 'created_at';
    const sortOrder = query.sortOrder ?? 'desc';

    const [posts, total] = await prisma.$transaction([
        prisma.communityPost.findMany({
            where,
            orderBy: { [sortField]: sortOrder },
            skip,
            take: limit,
            include: baseInclude()
        }),
        prisma.communityPost.count({ where }),
    ]);

    return toListResponse(posts, total, page, limit);
}

// ================= GET BY TYPE =================
export async function getPostByType(type: PostType, query: CommunityPostListQuery = {}) {
    return getCommunityPost({ ...query, type });
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
export async function getPostByCommunityId(communityId: number, query: CommunityPostListQuery = {}) {
    return getCommunityPost({ ...query, communityId });
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
