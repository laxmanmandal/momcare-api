import prisma from '../prisma/client'
import { Prisma } from '@prisma/client';
import { deleteFileIfExists } from '../utils/fileUploads'
import { BadRequest } from 'http-errors';
function toValidInt(v: any): number | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    return Math.trunc(n);
}

export async function getExpertPost(query: any = {}) {
    const {
        page = 1,
        limit = 10,
        search,
        communityId,
        professionId,
        isFeatured,
        isActive,
        expert_id,
        mediaType,
        sortField,
        sortOrder
    } = query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (pageNumber - 1) * pageSize;

    const whereClause: any = {};

    if (search) {
        whereClause.OR = [
            { title: { contains: search } },
            { content: { contains: search } },
            { Expert: { name: { contains: search } } }
        ];
    }

    if (communityId !== undefined) whereClause.communityId = Number(communityId);
    if (isFeatured !== undefined) whereClause.isFeatured = String(isFeatured) === 'true';
    if (isActive !== undefined) whereClause.is_active = String(isActive) === 'true';
    if (expert_id !== undefined) whereClause.expert_id = Number(expert_id);
    if (mediaType !== undefined) whereClause.mediaType = mediaType;
    
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

    const orderBy: Prisma.expertPostsOrderByWithRelationInput =
        sortField && allowedSortFields.includes(sortField)
            ? { [sortField]: sortOrder === 'asc' ? 'asc' : 'desc' }
            : { created_at: 'desc' };

    const [posts, total] = await prisma.$transaction([
        prisma.expertPosts.findMany({
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
        prisma.expertPosts.count({ where: whereClause })
    ]);

    const data = posts.map(post => {
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

    return {
        data,
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
    };
}
export async function getExpertPostByProfessionId(professionId: number, query: any = {}) {
    return getExpertPost({ ...query, professionId });
}

export async function getExpertPostByCommunityId(communityId: number, query: any = {}) {
    return getExpertPost({ ...query, communityId });
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
    if (payload.isFeatured !== undefined) data.isFeatured = Boolean(payload.isFeatured);
    // Scalar foreign keys
    const communityId = toValidInt(payload.communityId);
    if (communityId !== undefined) {
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

export async function getProfessionById(id: number) {
    return prisma.professions.findUnique({
        where: { id }
    });
}

export async function createProfessions(data: any) {
    return prisma.professions.create({ data })
}

export async function updateProfession(id: number, data: any) {
    return prisma.professions.update({
        where: { id },
        data
    });
}
