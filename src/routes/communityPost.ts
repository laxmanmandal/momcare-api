import { FastifyInstance } from 'fastify';
import * as communityService from '../services/communityPosts';
import { authMiddleware } from '../middleware/auth';
import { zodToJsonSchema } from '../utils/zodOpenApi';
import {
    communityPostCreateMultipartSchema,
    communityPostIdParamsSchema,
    communityPostTypeParamsSchema,
    communityPostUpdateMultipartSchema,
    positiveIntSchema,
    validateData
} from '../validations';

const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true }
    }
} as const;

const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object', additionalProperties: true } }
    }
} as const;

export default async function communityPost(app: FastifyInstance) {
    app.addHook('preHandler', authMiddleware);

    app.post(
        '/',
        {
            schema: {
                tags: ['Community Posts'],
                summary: 'Create a community post',
                consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
                body: zodToJsonSchema(communityPostCreateMultipartSchema as any, { target: 'openApi3' }),
                response: { 201: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { fields, files } = validateData(
                communityPostCreateMultipartSchema,
                await app.parseMultipartMemory(req)
            );
            const userId = validateData(positiveIntSchema, req.user?.id);

            if (fields.userId !== undefined && fields.userId !== userId) {
                throw Object.assign(new Error('Unauthorized user'), {
                    statusCode: 403,
                    code: 'FORBIDDEN'
                });
            }

            const payload = {
                title: fields.title,
                content: fields.content,
                communityId: fields.communityId,
                userId,
                mediaType: fields.mediaType,
                type: fields.type
            };

            const data = await communityService.createCommunityPost(payload as any);

            if (files.media?.length) {
                const media = await app.saveFileBuffer(files.media[0], 'community_posts');
                await communityService.updateCommunityPost(data.id, { media });
                data.media = media;
            }

            return reply.code(201).send({
                success: true,
                message: 'Post created',
                data
            });
        }
    );

    app.patch(
        '/:id',
        {
            schema: {
                tags: ['Community Posts'],
                summary: 'Update a community post',
                consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
                body: zodToJsonSchema(communityPostUpdateMultipartSchema as any, { target: 'openApi3' }),
                params: zodToJsonSchema(communityPostIdParamsSchema as any, { target: 'openApi3' }),
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { id } = validateData(communityPostIdParamsSchema, req.params);
            const { fields, files } = validateData(
                communityPostUpdateMultipartSchema,
                await app.parseMultipartMemory(req)
            );
            const userId = validateData(positiveIntSchema, req.user?.id);

            if (fields.userId !== undefined && fields.userId !== userId) {
                throw Object.assign(new Error('Unauthorized user'), {
                    statusCode: 403,
                    code: 'FORBIDDEN'
                });
            }

            const payload: Record<string, unknown> = {
                title: fields.title,
                content: fields.content,
                communityId: fields.communityId,
                userId: fields.userId !== undefined ? userId : undefined,
                mediaType: fields.mediaType,
                type: fields.type,
                media: undefined
            };

            if (files.media?.length) {
                payload.media = await app.saveFileBuffer(files.media[0], 'community_posts');
            }

            const data = await communityService.updateCommunityPost(id, payload as any);

            return reply.send({
                success: true,
                message: 'Post updated',
                data
            });
        }
    );

    app.get(
        '/',
        {
            schema: {
                tags: ['Community Posts'],
                summary: 'List all community posts',
                response: { 200: successArrayResponse }
            }
        },
        async (_req, reply) => {
            const data = await communityService.getCommunityPost();

            return reply.send({
                success: true,
                data
            });
        }
    );

    app.get(
        '/type/:type',
        {
            schema: {
                tags: ['Community Posts'],
                params: zodToJsonSchema(communityPostTypeParamsSchema as any, { target: 'openApi3' }),
                summary: 'List community posts by type',
                response: { 200: successArrayResponse }
            }
        },
        async (req, reply) => {
            const { type } = validateData(communityPostTypeParamsSchema, req.params);
            const data = await communityService.getPostByType(type);

            return reply.send({
                success: true,
                data
            });
        }
    );

    app.get(
        '/user/posts',
        {
            schema: {
                tags: ['Community Posts'],
                summary: 'List community posts for the authenticated user',
                response: { 200: successArrayResponse }
            }
        },
        async (req, reply) => {
            const data = await communityService.getPostByUser(req.user?.id);

            return reply.send({
                success: true,
                data
            });
        }
    );

    app.get(
        '/community/:id',
        {
            schema: {
                tags: ['Community Posts'],
                params: zodToJsonSchema(communityPostIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'List community posts by community ID',
                response: { 200: successArrayResponse }
            }
        },
        async (req, reply) => {
            const { id } = validateData(communityPostIdParamsSchema, req.params);
            const data = await communityService.getPostByCommunityId(id);

            return reply.send({
                success: true,
                data
            });
        }
    );

    app.get(
        '/:id',
        {
            schema: {
                tags: ['Community Posts'],
                params: zodToJsonSchema(communityPostIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Get a community post by ID',
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { id } = validateData(communityPostIdParamsSchema, req.params);
            const data = await communityService.getCommunityPostById(id);

            return reply.send({
                success: true,
                data
            });
        }
    );

    app.patch(
        '/:id/status',
        {
            schema: {
                tags: ['Community Posts'],
                consumes: ['application/json', 'application/x-www-form-urlencoded'],
                params: zodToJsonSchema(communityPostIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Toggle a community post status',
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { id } = validateData(communityPostIdParamsSchema, req.params);
            const data = await communityService.communityPostStatus(id);

            return reply.send({
                success: true,
                message: 'Status updated',
                data
            });
        }
    );
}
