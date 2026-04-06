import prisma from '../prisma/client'
import { deleteFileIfExists } from '../utils/fileUploads'
import { BadRequest } from 'http-errors';
function toValidInt(v: any): number | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    return Math.trunc(n);
}
export async function getExpertPost() {
    const posts = await prisma.expertPosts.findMany({
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

    return posts.map(post => {
        const reactionCounts: Record<string, number> = {};

        post.Reaction.forEach(r => {
            reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
        });

        return {
            ...post,
            reactionCounts,
            userReaction: null
        };
    });
}
export async function getExpertPostByProfessionId(professionId: number) {
    const posts = await prisma.expertPosts.findMany({
        where: {
            Expert: {
                Professions: {
                    is: {
                        id: professionId
                    }
                }
            }
        }
        ,
        orderBy: { created_at: 'desc' },
        include: {
            Reaction: {
                select: { type: true }
            },
            _count: {
                select: { Reaction: true }
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

    return posts.map(post => {
        const reactionCounts: Record<string, number> = {};

        post.Reaction.forEach(r => {
            reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
        });

        return {
            ...post,
            reactionCounts,
            userReaction: null
        };
    });
}

export async function getExpertPostById(id: number) {
    return await prisma.expertPosts.findFirst({
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
    },
    )
}
export async function createExpertPost(data: any) {
    return prisma.expertPosts.create({ data })
}
export async function updateExpertPost(id: any, payload: any) {
    const postId = toValidInt(id);
    if (!postId) throw new Error('Invalid post id');

    // Fetch existing post (we need existing.media and to ensure record exists)
    const existing = await prisma.expertPosts.findUnique({
        where: { id: postId },
        select: {
            id: true,
            media: true,
            // include anything else you might need for logic
        }
    });
    if (!existing) throw new Error('CommunityPost not found');

    // Whitelist allowed updatable fields
    const data: any = {};

    // Strings
    if (payload.title !== undefined) data.title = String(payload.title);
    if (payload.content !== undefined) data.content = String(payload.content);
    if (payload.media !== undefined) data.media = payload.media === null ? null : String(payload.media);
    if (payload.mediaType !== undefined) data.mediaType = payload.mediaType === null ? null : String(payload.mediaType);

    if (payload.type !== undefined) data.type = payload.type;
    // Scalar foreign keys
    const communityId = toValidInt(payload.communityId);
    if (communityId !== undefined) {
        if (communityId === null) throw new BadRequest('communityId cannot be null (field is required in model)');
        data.communityId = communityId;
    }

    const userId = toValidInt(payload.userId);
    if (userId !== undefined) {
        if (userId === null) throw new BadRequest('userId cannot be null (field is required in model)');
        data.userId = userId;
    }


    // Nothing to update?
    if (Object.keys(data).length === 0) {
        throw new BadRequest('No valid fields provided to update');
    }

    // Perform update first
    const updated = await prisma.expertPosts.update({
        where: { id: postId },
        data
    });

    // If media changed (and there was an old media) — delete old file asynchronously (don't fail the request if deletion fails)

    if (payload.media !== undefined && existing.media && existing.media !== payload.media) {
        // deleteFileIfExists should handle missing files gracefully
        await deleteFileIfExists(existing.media);
    }

    return updated;
}
export async function incrementShareCount(PostId: any) {
    const postId = toValidInt(PostId);
    if (!postId) throw new BadRequest('Invalid post id');

    const updated = await prisma.expertPosts.update({
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
export async function incrementViewCount(PostId: any) {
    const postId = toValidInt(PostId);
    if (!postId) throw new BadRequest('Invalid post id');

    const updated = await prisma.expertPosts.update({
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
export async function expertPostStatus(id: number) {
    const post = await prisma.expertPosts.findUnique({ where: { id } });
    if (!post) throw new BadRequest("Expert Post not found");

    return prisma.expertPosts.update({
        where: { id },
        data: { is_active: !post.is_active },
    });
}
// ------------ professions -----------------

export async function getProfessions() {
    return prisma.professions.findMany();
}

export async function createProfessions(data: any) {
    return prisma.professions.create({ data })
}