import { FastifyInstance } from 'fastify'
import * as communityPosts from '../services/communityPosts'
import { authMiddleware } from '../middleware/auth';
export default async function communityPost(app: FastifyInstance) {
    app.addHook('preHandler', authMiddleware)
    app.post('/',
        {
            preHandler: [authMiddleware],
            schema: {
                tags: ['Community post'],
                consumes: ['multipart/form-data'],
                body: {
                    type: 'object',
                    required: ['title', 'content', 'communityId', 'userId', 'mediaType'],
                    additionalProperties: false,
                    properties: {
                        title: { type: 'string' },
                        content: { type: 'string' },
                        communityId: { type: 'integer', minimum: 1 },
                        userId: { type: 'integer', minimum: 1 },
                        mediaType: { type: 'string' },
                        media: { type: 'string', contentEncoding: 'binary' }
                    }
                },
            }
        },
        async (req, reply) => {

            const { files, fields } = await app.parseMultipartMemory(req);


            const community = {
                title: fields.title,
                content: fields.content,
                communityId: Number(fields.communityId),
                userId: Number(fields.userId),
                mediaType: fields.mediaType,

            };

            const communityData = await communityPosts.createCommunityPost(community);

            if (files.media?.length) {
                const media = await app.saveFileBuffer(files.media[0], 'community_posts');
                await communityPosts.updateCommunityPost(Number(communityData.id), { media });
                Object.assign(communityData, { media });
            }

            reply.code(200).send({
                success: true,
                message: 'Community post created successfully',
                data: communityData,
            });

        });
    app.patch(
        '/:id',
        {
            schema: {
                tags: ['Community post'],
                consumes: ['application/json', 'multipart/form-data'],
                body: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        title: { type: 'string' },
                        content: { type: 'string' },
                        communityId: { type: 'integer', minimum: 1 },
                        userId: { type: 'integer', minimum: 1 },
                        mediaType: { type: 'string' },
                        media: { type: 'string', contentEncoding: 'binary' }
                    }
                }
            }
        },
        async (req, reply) => {

            const { id } = req.params as { id: string };

            // Parse form data (multipart or json)
            const { files, fields } = await app.parseMultipartMemory(req);
            if (!req.isMultipart() && req.body) Object.assign(fields, req.body);
            // Prepare update payload
            const payload = {
                title: fields.title,
                content: fields.content,
                communityId: Number(fields.communityId),
                userId: fields.userId,
                mediaType: fields.mediaType,
                media: undefined as string | undefined
            };

            // Handle thumbnail upload (if provided)
            if (files.media?.length) {
                payload.media = await app.saveFileBuffer(
                    files.media[0],
                    `community_posts`
                );
            }
            // Update database record
            const communityData = await communityPosts.updateCommunityPost(Number(id), payload);

            reply.code(200).send({
                success: true,
                message: 'community post updated successfully',
                data: communityData,
            });

        }
    );
    app.patch(
        '/share/:postId',
        { schema: { tags: ['Community post'] } },
        async (req, reply) => {

            const { postId } = req.params as { postId: string };


            // Update database record
            const communityData = await communityPosts.incrementShareCount(Number(postId));

            reply.code(200).send({
                success: true,
                message: 'community post updated successfully',
                data: communityData,
            });

        }
    );
    app.patch(
        '/view/:postId',
        { schema: { tags: ['Community post'] } },
        async (req, reply) => {

            const { postId } = req.params as { postId: string };


            // Update database record
            const communityData = await communityPosts.incrementViewCount(Number(postId));

            reply.code(200).send({
                success: true,
                message: 'community post updated successfully',
                data: communityData,
            });

        }
    );
    app.get('/',
        { schema: { tags: ['Community post'] } },
        async (req, reply) => {

            const communities = await communityPosts.getCommunityPost();
            reply.code(200).send({
                success: true,
                message: 'community posts fetched successfully',
                data: communities,
            });

        });
    app.get('/type/:type',
        { schema: { tags: ['Community post'] } },
        async (req, reply) => {

            const { type } = req.params as { type: string };

            const communities = await communityPosts.getPostByType(type as any);
            reply.code(200).send({
                success: true,
                message: 'community posts fetched successfully',
                data: communities,
            });

        });

    app.get('/user/posts',
        { schema: { tags: ['Community post'] } },
        async (req, reply) => {

            const communities = await communityPosts.getpostByUser();
            reply.code(200).send({
                success: true,
                message: 'community posts fetched successfully',
                data: communities,
            });

        });
    app.get('/communityId/:id',
        { schema: { tags: ['Community post'] } },
        async (req, reply) => {

            const { id } = req.params as { id: string };
            const numericId = Number(id);

            if (isNaN(numericId)) {
                return reply.code(500).send({
                    success: false,
                    message: 'Invalid ID',
                });
            }

            const community = await communityPosts.getpostByCommunityId(numericId);

            reply.code(200).send({
                success: true,
                message: 'community post fetched successfully',
                data: community,
            });

        });
    app.get('/:id', { schema: { tags: ['Community post'] } },
        async (req, reply) => {

            const { id } = req.params as { id: string };
            const numericId = Number(id);

            if (isNaN(numericId)) {
                return reply.code(500).send({
                    success: false,
                    message: 'Invalid ID',
                });
            }

            const community = await communityPosts.getCommunitypostById(numericId);

            reply.code(200).send({
                success: true,
                message: 'community post fetched successfully',
                data: community,
            });

        });
    app.patch('/:id/status', { schema: { tags: ['Community post'] } }, async (req, reply) => {

        const { id } = req.params as { id: number };
        const community = await communityPosts.communityPostStatus(id);
        return reply.send({ success: true, message: 'Community post status updated successfully', data: community });

    });
}
