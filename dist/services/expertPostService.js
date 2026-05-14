"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpertPost = getExpertPost;
exports.getExpertPostByProfessionId = getExpertPostByProfessionId;
exports.getExpertPostByCommunityId = getExpertPostByCommunityId;
exports.getExpertPostById = getExpertPostById;
exports.createExpertPost = createExpertPost;
exports.updateExpertPost = updateExpertPost;
exports.incrementShareCount = incrementShareCount;
exports.incrementViewCount = incrementViewCount;
exports.expertPostStatus = expertPostStatus;
exports.getProfessions = getProfessions;
exports.getProfessionById = getProfessionById;
exports.createProfessions = createProfessions;
exports.updateProfession = updateProfession;
const client_1 = __importDefault(require("../prisma/client"));
const fileUploads_1 = require("../utils/fileUploads");
const http_errors_1 = require("http-errors");
function toValidInt(v) {
    if (v === undefined)
        return undefined;
    if (v === null)
        return null;
    const n = Number(v);
    if (!Number.isFinite(n))
        return undefined;
    return Math.trunc(n);
}
async function getExpertPost(query = {}) {
    const { page = 1, limit = 10, search, communityId, professionId, isFeatured, isActive, expert_id, mediaType, sortField, sortOrder } = query;
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (pageNumber - 1) * pageSize;
    const whereClause = {};
    if (search) {
        whereClause.OR = [
            { title: { contains: search } },
            { content: { contains: search } },
            { Expert: { name: { contains: search } } }
        ];
    }
    if (communityId !== undefined)
        whereClause.communityId = Number(communityId);
    if (isFeatured !== undefined)
        whereClause.isFeatured = String(isFeatured) === 'true';
    if (isActive !== undefined)
        whereClause.is_active = String(isActive) === 'true';
    if (expert_id !== undefined)
        whereClause.expert_id = Number(expert_id);
    if (mediaType !== undefined)
        whereClause.mediaType = mediaType;
    if (professionId !== undefined) {
        whereClause.Expert = {
            Professions: { is: { id: Number(professionId) } }
        };
    }
    const allowedSortFields = [
        'id',
        'title',
        'mediaType',
        'is_active',
        'isFeatured',
        'share_count',
        'view_count',
        'created_at',
        'updated_at'
    ];
    const orderBy = sortField && allowedSortFields.includes(sortField)
        ? { [sortField]: sortOrder === 'asc' ? 'asc' : 'desc' }
        : { created_at: 'desc' };
    const [posts, total] = await client_1.default.$transaction([
        client_1.default.expertPosts.findMany({
            where: whereClause,
            skip,
            take: pageSize,
            orderBy,
            include: {
                Reaction: {
                    select: {
                        type: true
                    }
                },
                _count: {
                    select: {
                        Reaction: true,
                    }
                },
                Expert: {
                    select: {
                        id: true,
                        name: true,
                        Professions: true
                    }
                }
            }
        }),
        client_1.default.expertPosts.count({ where: whereClause })
    ]);
    const data = posts.map(post => {
        const reactionCounts = {};
        post.Reaction.forEach(r => {
            reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
        });
        return {
            ...post,
            reactionCounts,
            userReaction: null
        };
    });
    return {
        data,
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
    };
}
async function getExpertPostByProfessionId(professionId, query = {}) {
    return getExpertPost({ ...query, professionId });
}
async function getExpertPostByCommunityId(communityId, query = {}) {
    return getExpertPost({ ...query, communityId });
}
async function getExpertPostById(id) {
    return await client_1.default.expertPosts.findFirst({
        where: { id },
        include: {
            Reaction: {
                select: {
                    type: true
                }
            },
            _count: {
                select: {
                    Reaction: true,
                }
            },
            Expert: {
                select: {
                    id: true,
                    name: true,
                    Professions: true
                }
            }
        }
    });
}
async function createExpertPost(data) {
    return client_1.default.expertPosts.create({ data });
}
async function updateExpertPost(id, payload) {
    const postId = toValidInt(id);
    if (!postId)
        throw new Error('Invalid post id');
    // Fetch existing post (we need existing.media and to ensure record exists)
    const existing = await client_1.default.expertPosts.findUnique({
        where: { id: postId },
        select: {
            id: true,
            media: true,
            // include anything else you might need for logic
        }
    });
    if (!existing)
        throw new Error('CommunityPost not found');
    // Whitelist allowed updatable fields
    const data = {};
    // Strings
    if (payload.title !== undefined)
        data.title = String(payload.title);
    if (payload.content !== undefined)
        data.content = String(payload.content);
    if (payload.media !== undefined)
        data.media = payload.media === null ? null : String(payload.media);
    if (payload.mediaType !== undefined)
        data.mediaType = payload.mediaType === null ? null : String(payload.mediaType);
    if (payload.type !== undefined)
        data.type = payload.type;
    if (payload.isFeatured !== undefined)
        data.isFeatured = Boolean(payload.isFeatured);
    // Scalar foreign keys
    const communityId = toValidInt(payload.communityId);
    if (communityId !== undefined) {
        data.communityId = communityId;
    }
    const userId = toValidInt(payload.userId);
    if (userId !== undefined) {
        if (userId === null)
            throw new http_errors_1.BadRequest('userId cannot be null (field is required in model)');
        data.userId = userId;
    }
    // Nothing to update?
    if (Object.keys(data).length === 0) {
        throw new http_errors_1.BadRequest('No valid fields provided to update');
    }
    // Perform update first
    const updated = await client_1.default.expertPosts.update({
        where: { id: postId },
        data
    });
    // If media changed (and there was an old media) — delete old file asynchronously (don't fail the request if deletion fails)
    if (payload.media !== undefined && existing.media && existing.media !== payload.media) {
        // deleteFileIfExists should handle missing files gracefully
        await (0, fileUploads_1.deleteFileIfExists)(existing.media);
    }
    return updated;
}
async function incrementShareCount(PostId) {
    const postId = toValidInt(PostId);
    if (!postId)
        throw new http_errors_1.BadRequest('Invalid post id');
    const updated = await client_1.default.expertPosts.update({
        where: { id: postId },
        data: {
            share_count: {
                increment: 1
            }
        },
        select: {
            id: true,
            share_count: true
        }
    });
    return updated;
}
async function incrementViewCount(PostId) {
    const postId = toValidInt(PostId);
    if (!postId)
        throw new http_errors_1.BadRequest('Invalid post id');
    const updated = await client_1.default.expertPosts.update({
        where: { id: postId },
        data: {
            view_count: {
                increment: 1
            }
        },
        select: {
            id: true,
            view_count: true
        }
    });
    return updated;
}
async function expertPostStatus(id) {
    const post = await client_1.default.expertPosts.findUnique({ where: { id } });
    if (!post)
        throw new http_errors_1.BadRequest("Expert Post not found");
    return client_1.default.expertPosts.update({
        where: { id },
        data: { is_active: !post.is_active },
    });
}
// ------------ professions -----------------
async function getProfessions() {
    return client_1.default.professions.findMany();
}
async function getProfessionById(id) {
    return client_1.default.professions.findUnique({
        where: { id }
    });
}
async function createProfessions(data) {
    return client_1.default.professions.create({ data });
}
async function updateProfession(id, data) {
    return client_1.default.professions.update({
        where: { id },
        data
    });
}
//# sourceMappingURL=expertPostService.js.map