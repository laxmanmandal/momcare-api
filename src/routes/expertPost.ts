import { FastifyInstance } from 'fastify'
import * as expertPostService from '../services/expertPostService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
import { zodToJsonSchema } from '../utils/zodOpenApi';
import {
    expertPostCreateMultipartSchema,
    expertPostIdParamsSchema,
    expertPostShareParamsSchema,
    expertPostUpdateMultipartSchema,
    expertProfessionParamsSchema,
    professionCreateSchema,
    validateData,
    zodToSwagger
} from '../validations';
import { z } from 'zod';

const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true }
    }
} as const

const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object', additionalProperties: true } }
    }
} as const

const paginatedResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object', additionalProperties: true } },
        total: { type: 'integer' },
        page: { type: 'integer' },
        limit: { type: 'integer' },
        totalPages: { type: 'integer' }
    }
} as const;

const paginationQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
});

const expertPostQuerySchema = paginationQuerySchema.extend({
    search: z.string().optional(),
    communityId: z.coerce.number().optional(),
    professionId: z.coerce.number().optional(),
    isFeatured: z.enum(['true', 'false']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    expert_id: z.coerce.number().optional(),
    mediaType: z.string().optional(),
    sortField: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});

export default async function expertPost(app: FastifyInstance) {
    app.addHook('preHandler', authMiddleware)

    app.post(
        '/',
        {
            schema: {
                tags: ['Expert Posts'],
                consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
                body: zodToSwagger(expertPostCreateMultipartSchema),
                summary: 'Create an expert post',
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { fields, files } = validateData(
                expertPostCreateMultipartSchema,
                await app.parseMultipartMemory(req)
            );
            const post = {
                title: fields.title,
                content: fields.content,
                expert_id: fields.expert_id,
                mediaType: fields.mediaType,
                communityId: (fields as any).communityId ? Number((fields as any).communityId) : undefined,
                isFeatured: (fields as any).isFeatured !== undefined ? String((fields as any).isFeatured) === 'true' : false
            };
            const postData = await expertPostService.createExpertPost(post);

            if (files.media?.length) {
                const media = await app.saveFileBuffer(files.media[0], '_expert_posts');
                await expertPostService.updateExpertPost(Number(postData.id), { media });
                Object.assign(postData, { media });
            }

            reply.code(200).send({
                success: true,
                message: 'Expert Post created successfully',
                data: postData,
            });
        }
    );

    app.patch(
        '/:id',
        {
            schema: {
                tags: ['Expert Posts'],
                consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
                body: zodToSwagger(expertPostUpdateMultipartSchema),
                params: zodToJsonSchema(expertPostIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Update an expert post',
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { id } = validateData(expertPostIdParamsSchema, req.params);
            const { files, fields } = await app.parseMultipartMemory(req);
            if (!req.isMultipart() && req.body) Object.assign(fields, req.body);

            const payload = {
                title: fields.title,
                content: fields.content,
                expert_id: Number(fields.expert_id),
                mediaType: fields.mediaType,
                media: undefined as string | undefined,
                communityId: (fields as any).communityId ? Number((fields as any).communityId) : undefined,
                isFeatured: (fields as any).isFeatured !== undefined ? String((fields as any).isFeatured) === 'true' : undefined
            };

            if (files.media?.length) {
                payload.media = await app.saveFileBuffer(files.media[0], `_expert_posts`);
            }

            const expertPostData = await expertPostService.updateExpertPost(Number(id), payload);

            reply.code(200).send({
                success: true,
                message: 'Expert Post updated successfully',
                data: expertPostData,
            });
        }
    );

    app.patch(
        '/share/:postId',
        {
            schema: {
                tags: ['Expert Posts'],
                consumes: ['application/json', 'application/x-www-form-urlencoded'],
                params: zodToJsonSchema(expertPostShareParamsSchema as any, { target: 'openApi3' }),
                summary: 'Increment expert post share count',
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { postId } = validateData(expertPostShareParamsSchema, req.params);
            const communityData = await expertPostService.incrementShareCount(postId);

            reply.code(200).send({
                success: true,
                message: 'Expert Post updated successfully',
                data: communityData,
            });
        }
    );

    app.patch(
        '/view/:postId',
        {
            schema: {
                tags: ['Expert Posts'],
                consumes: ['application/json', 'application/x-www-form-urlencoded'],
                params: zodToJsonSchema(expertPostShareParamsSchema as any, { target: 'openApi3' }),
                summary: 'Increment expert post view count',
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { postId } = validateData(expertPostShareParamsSchema, req.params);
            const communityData = await expertPostService.incrementViewCount(postId);

            reply.code(200).send({
                success: true,
                message: 'Expert Post updated successfully',
                data: communityData,
            });
        }
    );

    app.get(
        '/',
        {
            schema: {
                tags: ['Expert Posts'],
                summary: 'List expert posts',
                querystring: zodToJsonSchema(expertPostQuerySchema as any, { target: 'openApi3' }),
                response: { 200: paginatedResponse }
            }
        },
        async (req, reply) => {
            const query = validateData(expertPostQuerySchema, req.query ?? {});
            const result = await expertPostService.getExpertPost(query);
            
            return reply.code(200).send({
                success: true,
                message: 'Expert Posts fetched successfully',
                ...result,
            });
        }
    );

    app.get(
        '/profession/:professionId',
        {
            schema: {
                tags: ['Expert Posts'],
                params: zodToJsonSchema(expertProfessionParamsSchema as any, { target: 'openApi3' }),
                querystring: zodToJsonSchema(paginationQuerySchema as any, { target: 'openApi3' }),
                summary: 'List expert posts by profession ID',
                response: { 200: paginatedResponse }
            }
        },
        async (req, reply) => {
            const { professionId } = validateData(expertProfessionParamsSchema, req.params);
            const query = validateData(paginationQuerySchema, req.query ?? {});

            const posts = await expertPostService.getExpertPostByProfessionId(professionId, query);

            reply.code(200).send({
                success: true,
                message: 'Expert Posts fetched successfully',
                ...posts
            });
        }
    );

    app.get(
        '/:id',
        {
            schema: {
                tags: ['Expert Posts'],
                params: zodToJsonSchema(expertPostIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Get expert post by ID',
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { id } = validateData(expertPostIdParamsSchema, req.params);
            const community = await expertPostService.getExpertPostById(id);

            reply.code(200).send({
                success: true,
                message: 'Expert Post fetched successfully',
                data: community,
            });
        }
    );

    app.get(
        '/community/:id',
        {
            schema: {
                tags: ['Expert Posts'],
                params: zodToJsonSchema(expertPostIdParamsSchema as any, { target: 'openApi3' }),
                querystring: zodToJsonSchema(paginationQuerySchema as any, { target: 'openApi3' }),
                summary: 'List expert posts by community ID',
                response: { 200: paginatedResponse }
            }
        },
        async (req, reply) => {
            const { id } = validateData(expertPostIdParamsSchema, req.params);
            const query = validateData(paginationQuerySchema, req.query ?? {});
            
            const posts = await expertPostService.getExpertPostByCommunityId(id, query);
            
            return reply.code(200).send({
                success: true,
                message: 'Expert Posts fetched successfully',
                ...posts
            });
        }
    );

    app.patch(
        '/:id/status',
        {
            schema: {
                tags: ['Expert Posts'],
                consumes: ['application/json', 'application/x-www-form-urlencoded'],
                params: zodToJsonSchema(expertPostIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Toggle expert post status',
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { id } = validateData(expertPostIdParamsSchema, req.params);
            const community = await expertPostService.expertPostStatus(id);
            return reply.send({ success: true, message: 'Expert Post status updated successfully', data: community });
        }
    );

    app.post(
        '/profession',
        {
            preHandler: [onlyOrg],
            schema: {
                tags: ['Expert Posts'],
                consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
                body: zodToJsonSchema(professionCreateSchema as any, { target: 'openApi3' }),
                summary: 'Create a profession',
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { fields } = req.isMultipart()
                ? await app.parseMultipartMemory(req)
                : { fields: (req.body as Record<string, any>) ?? {} };
            const { name } = validateData(professionCreateSchema, fields);
            const PData = await expertPostService.createProfessions({ name });

            reply.code(200).send({
                success: true,
                message: 'Profession created successfully',
                data: PData,
            });
        }
    );

    app.get(
        '/professions',
        {
            schema: {
                tags: ['Expert Posts'],
                summary: 'List professions',
                response: { 200: successArrayResponse }
            }
        },
        async () => {
            const professons = await expertPostService.getProfessions();
            return {
                success: true,
                message: 'Expert Posts fetched successfully',
                data: professons,
            };
        }
    );

    app.get(
        '/professions/:id',
        {
            schema: {
                tags: ['Expert Posts'],
                params: zodToJsonSchema(expertPostIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Get profession by ID',
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { id } = validateData(expertPostIdParamsSchema, req.params);
            const profession = await expertPostService.getProfessionById(id);

            reply.code(200).send({
                success: true,
                message: 'Profession fetched successfully',
                data: profession,
            });
        }
    );

    app.patch(
        '/professions/:id',
        {
            preHandler: [onlyOrg],
            schema: {
                tags: ['Expert Posts'],
                consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
                params: zodToJsonSchema(expertPostIdParamsSchema as any, { target: 'openApi3' }),
                body: zodToJsonSchema(professionCreateSchema as any, { target: 'openApi3' }),
                summary: 'Update a profession',
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { id } = validateData(expertPostIdParamsSchema, req.params);
            const { fields } = req.isMultipart()
                ? await app.parseMultipartMemory(req)
                : { fields: (req.body as Record<string, any>) ?? {} };
            const { name } = validateData(professionCreateSchema, fields);
            const profession = await expertPostService.updateProfession(id, { name });

            reply.code(200).send({
                success: true,
                message: 'Profession updated successfully',
                data: profession,
            });
        }
    );
}
