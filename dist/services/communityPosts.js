"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommunityPost = getCommunityPost;
exports.getPostByType = getPostByType;
exports.getPostByUser = getPostByUser;
exports.getCommunityPostById = getCommunityPostById;
exports.getPostByCommunityId = getPostByCommunityId;
exports.createCommunityPost = createCommunityPost;
exports.updateCommunityPost = updateCommunityPost;
exports.incrementShareCount = incrementShareCount;
exports.incrementViewCount = incrementViewCount;
exports.communityPostStatus = communityPostStatus;
const client_1 = __importDefault(require("../prisma/client"));
const fileUploads_1 = require("../utils/fileUploads");
// ================= HELPER =================
function toValidInt(v) {
    if (v === undefined || v === null)
        return undefined;
    const n = Number(v);
    return Number.isInteger(n) ? n : undefined;
}
function buildReactionCounts(reactions) {
    const counts = {};
    for (const r of reactions) {
        counts[r.type] = (counts[r.type] || 0) + 1;
    }
    return counts;
}
function buildCommunityPostWhere(query) {
    const where = {};
    if (query.search) {
        where.OR = [
            { title: { contains: query.search } },
            { content: { contains: query.search } },
            { mediaType: { contains: query.search } },
            { community: { name: { contains: query.search } } },
            { user: { name: { contains: query.search } } },
        ];
    }
    if (query.type)
        where.type = query.type;
    if (query.communityId !== undefined)
        where.communityId = query.communityId;
    if (query.userId !== undefined)
        where.userId = query.userId;
    if (query.mediaType)
        where.mediaType = query.mediaType;
    if (query.featured !== undefined)
        where.featured = query.featured;
    if (query.isActive !== undefined)
        where.isActive = query.isActive;
    return where;
}
function paginationFrom(query) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    return { page, limit, skip: (page - 1) * limit };
}
function toListResponse(posts, total, page, limit) {
    return {
        data: posts.map(post => ({
            ...post,
            reactionCounts: buildReactionCounts(post.Reaction ?? []),
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
async function getCommunityPost(query = {}) {
    const { page, limit, skip } = paginationFrom(query);
    const where = buildCommunityPostWhere(query);
    const sortField = query.sortField ?? 'created_at';
    const sortOrder = query.sortOrder ?? 'desc';
    const [posts, total] = await client_1.default.$transaction([
        client_1.default.communityPost.findMany({
            where,
            orderBy: { [sortField]: sortOrder },
            skip,
            take: limit,
            include: baseInclude()
        }),
        client_1.default.communityPost.count({ where }),
    ]);
    return toListResponse(posts, total, page, limit);
}
// ================= GET BY TYPE =================
async function getPostByType(type, query = {}) {
    return getCommunityPost({ ...query, type });
}
// ================= GET BY USER =================
async function getPostByUser(userId) {
    const posts = await client_1.default.communityPost.findMany({
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
async function getCommunityPostById(id) {
    return client_1.default.communityPost.findUnique({
        where: { id },
        include: baseInclude()
    });
}
// ================= GET BY COMMUNITY =================
async function getPostByCommunityId(communityId, query = {}) {
    return getCommunityPost({ ...query, communityId });
}
// ================= CREATE =================
async function createCommunityPost(data) {
    return client_1.default.communityPost.create({ data });
}
// ================= UPDATE =================
async function updateCommunityPost(id, payload) {
    const postId = toValidInt(id);
    if (!postId)
        throw new Error('Invalid post id');
    const existing = await client_1.default.communityPost.findUnique({
        where: { id: postId },
        select: { id: true, media: true }
    });
    if (!existing)
        throw new Error('CommunityPost not found');
    const updated = await client_1.default.communityPost.update({
        where: { id: postId },
        data: payload
    });
    // delete old media safely
    try {
        const nextMedia = typeof payload.media === 'string' ? payload.media : undefined;
        if (nextMedia && existing.media && existing.media !== nextMedia) {
            await (0, fileUploads_1.deleteFileIfExists)(existing.media);
        }
    }
    catch (err) {
        console.error('Media delete failed:', err);
    }
    return updated;
}
// ================= SHARE =================
async function incrementShareCount(id) {
    const postId = toValidInt(id);
    if (!postId)
        throw new Error('Invalid post id');
    return client_1.default.communityPost.update({
        where: { id: postId },
        data: { shareCount: { increment: 1 } },
        select: { id: true, shareCount: true }
    });
}
// ================= VIEW =================
async function incrementViewCount(id) {
    const postId = toValidInt(id);
    if (!postId)
        throw new Error('Invalid post id');
    return client_1.default.communityPost.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
        select: { id: true, viewCount: true }
    });
}
// ================= STATUS =================
async function communityPostStatus(id) {
    const post = await client_1.default.communityPost.findUnique({ where: { id } });
    if (!post)
        throw new Error("Community Post not found");
    return client_1.default.communityPost.update({
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
//# sourceMappingURL=communityPosts.js.map