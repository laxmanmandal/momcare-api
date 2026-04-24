"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommunityPost = getCommunityPost;
exports.getPostByType = getPostByType;
exports.getpostByUser = getpostByUser;
exports.getCommunitypostById = getCommunitypostById;
exports.getpostByCommunityId = getpostByCommunityId;
exports.createCommunityPost = createCommunityPost;
exports.updateCommunityPost = updateCommunityPost;
exports.incrementShareCount = incrementShareCount;
exports.incrementViewCount = incrementViewCount;
exports.communityPostStatus = communityPostStatus;
const client_1 = __importDefault(require("../prisma/client"));
const fileUploads_1 = require("../utils/fileUploads");
async function getCommunityPost() {
    const posts = await client_1.default.communityPost.findMany({
        orderBy: { created_at: "desc" },
        include: {
            Reaction: {
                select: {
                    type: true
                }
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
                    name: true,
                }
            }
        }
    });
    return posts;
}
async function getPostByType(type) {
    const posts = await client_1.default.communityPost.findMany({
        where: { type },
        orderBy: { created_at: "desc" },
        include: {
            Reaction: {
                select: {
                    type: true
                }
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
                    name: true,
                }
            }
        }
    });
    return posts.map(post => {
        const reactionCounts = {};
        post.Reaction.forEach(r => {
            reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
        });
        return {
            ...post,
            reactionCounts,
            userReaction: null // always null if no userId is used
        };
    });
}
async function getpostByUser(userId) {
    const posts = await client_1.default.communityPost.findMany({
        orderBy: { created_at: "desc" },
        include: {
            Reaction: {
                select: {
                    type: true,
                    userId: true
                }
            },
            user: {
                select: {
                    id: true,
                    name: true,
                }
            },
            community: {
                select: {
                    id: true,
                    name: true
                }
            },
            _count: {
                select: {
                    Reaction: true,
                    comments: true
                }
            }
        }
    });
    return posts.map(post => {
        const reactionCounts = {};
        post.Reaction.forEach(r => {
            reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
        });
        const userReaction = userId
            ? post.Reaction.find(r => r.userId === userId)?.type || null
            : null;
        return {
            ...post,
            reactionCounts,
            userReaction
        };
    });
}
async function getCommunitypostById(id) {
    return await client_1.default.communityPost.findUnique({
        where: { id }
    });
}
async function getpostByCommunityId(communityId) {
    return await client_1.default.communityPost.findMany({
        where: { communityId },
        include: {
            Reaction: {
                select: {
                    type: true
                }
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
                    name: true,
                }
            }
        }
    });
}
async function createCommunityPost(data) {
    return client_1.default.communityPost.create({ data });
}
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
async function updateCommunityPost(id, payload) {
    const postId = toValidInt(id);
    if (!postId)
        throw new Error('Invalid post id');
    // Fetch existing post (we need existing.media and to ensure record exists)
    const existing = await client_1.default.communityPost.findUnique({
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
    // Booleans
    if (payload.isActive !== undefined)
        data.isActive = Boolean(payload.isActive);
    if (payload.featured !== undefined)
        data.featured = Boolean(payload.featured);
    // Enum / type (validate externally if needed)
    if (payload.type !== undefined)
        data.type = payload.type;
    // Scalar foreign keys
    const communityId = toValidInt(payload.communityId);
    if (communityId !== undefined) {
        if (communityId === null)
            throw new Error('communityId cannot be null (field is required in model)');
        data.communityId = communityId;
    }
    const userId = toValidInt(payload.userId);
    if (userId !== undefined) {
        if (userId === null)
            throw new Error('userId cannot be null (field is required in model)');
        data.userId = userId;
    }
    // Nothing to update?
    if (Object.keys(data).length === 0) {
        throw new Error('No valid fields provided to update');
    }
    // Perform update first
    const updated = await client_1.default.communityPost.update({
        where: { id: postId },
        data
    });
    // If media changed (and there was an old media) — delete old file asynchronously (don't fail the request if deletion fails)
    try {
        if (payload.media !== undefined && existing.media && existing.media !== payload.media) {
            // deleteFileIfExists should handle missing files gracefully
            await (0, fileUploads_1.deleteFileIfExists)(existing.media);
        }
    }
    catch (err) {
        // Log the error but do not throw to the client (DB update already succeeded)
        // Replace console.error with your logger if available
        console.error('Failed to delete old media for CommunityPost', postId, err);
    }
    return updated;
}
async function incrementShareCount(PostId) {
    const postId = toValidInt(PostId);
    if (!postId)
        throw new Error('Invalid post id');
    const updated = await client_1.default.communityPost.update({
        where: { id: postId },
        data: {
            shareCount: {
                increment: 1
            }
        },
        select: {
            id: true,
            shareCount: true
        }
    });
    return updated;
}
async function incrementViewCount(PostId) {
    const postId = toValidInt(PostId);
    if (!postId)
        throw new Error('Invalid post id');
    const updated = await client_1.default.communityPost.update({
        where: { id: postId },
        data: {
            viewCount: {
                increment: 1
            }
        },
        select: {
            id: true,
            viewCount: true
        }
    });
    return updated;
}
async function communityPostStatus(id) {
    const tips = await client_1.default.communityPost.findUnique({ where: { id } });
    if (!tips)
        throw new Error("Community Post not found");
    return client_1.default.communityPost.update({
        where: { id },
        data: { isActive: !tips.isActive },
    });
}
//# sourceMappingURL=communityPosts.js.map