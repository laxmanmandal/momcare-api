import { FastifyInstance } from 'fastify'
import * as expertPostService from '../services/expertPostService'
import { authMiddleware, onlyOrg } from '../middleware/auth';

const expertPostIdParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: {
        id: { type: 'integer', minimum: 1 }
    }
} as const

const postIdParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['postId'],
    properties: {
        postId: { type: 'integer', minimum: 1 }
    }
} as const

const professionIdParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['professionId'],
    properties: {
        professionId: { type: 'integer', minimum: 1 }
    }
} as const

const expertPostBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        expert_id: { type: 'integer', minimum: 1 },
        mediaType: { type: 'string' },
        media: { type: 'string', contentEncoding: 'binary' }
    }
} as const

const professionBody = {
    type: 'object',
    additionalProperties: false,
    required: ['name'],
    properties: {
        name: { type: 'string', minLength: 1 }
    }
} as const

const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object' }
    }
} as const

const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object' } }
    }
} as const

export default async function expertPost(app: FastifyInstance) {
    app.addHook('preHandler', authMiddleware)
    app.post('/',
        {
            schema: {
                tags: ['Expert Posts'],
                consumes: ['multipart/form-data'],
                summary: 'Create an expert post',
                body: expertPostBody,
                response: { 200: successObjectResponse }
            }


        },
        async (req, reply) => {
            const { files, fields } = await app.parseMultipartMemory(req);
            console.log(files, fields);
            const post = {
                title: fields.title,
                content: fields.content,
                expert_id: Number(fields.expert_id),
                mediaType: fields.mediaType,

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

        });
    app.patch(
        '/:id',
        {
            schema: {
                tags: ['Expert Posts'],
                consumes: ['application/json', 'multipart/form-data'],
                summary: 'Update an expert post',
                params: expertPostIdParamsSchema,
                body: expertPostBody,
                response: { 200: successObjectResponse }
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
                expert_id: Number(fields.expert_id),
                mediaType: fields.mediaType,
                media: undefined as string | undefined
            };
            // Handle thumbnail upload (if provided)
            if (files.media?.length) {
                payload.media = await app.saveFileBuffer(
                    files.media[0],
                    `_expert_posts`
                );
            }
            // Update database record
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
                summary: 'Increment expert post share count',
                params: postIdParamsSchema,
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {

            const { postId } = req.params as { postId: string };


            // Update database record
            const communityData = await expertPostService.incrementShareCount(Number(postId));

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
                summary: 'Increment expert post view count',
                params: postIdParamsSchema,
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {

            const { postId } = req.params as { postId: string };


            // Update database record
            const communityData = await expertPostService.incrementViewCount(Number(postId));

            reply.code(200).send({
                success: true,
                message: 'Expert Post updated successfully',
                data: communityData,
            });

        }
    );
    app.get('/',
        {
            schema: {
                tags: ['Expert Posts'],
                summary: 'List expert posts',
                response: { 200: successArrayResponse }
            }
        },
        async (req, reply) => {

            const communities = await expertPostService.getExpertPost();
            reply.code(200).send({
                success: true,
                message: 'Expert Posts fetched successfully',
                data: communities,
            });

        });
    app.get(
        '/profession/:professionId',
        {
            schema: {
                tags: ['Expert Posts'],
                summary: 'List expert posts by profession ID',
                params: professionIdParamsSchema,
                response: { 200: successArrayResponse }
            }
        },
        async (req, reply) => {
            const { professionId } = req.params as { professionId: number };

            const posts =
                await expertPostService.getExpertPostByProfessionId(professionId);

            reply.code(200).send({
                success: true,
                message: 'Expert Posts fetched successfully',
                data: posts
            });
        }
    );
    app.get('/:id', {
        schema: {
            tags: ['Expert Posts'],
            summary: 'Get expert post by ID',
            params: expertPostIdParamsSchema,
            response: { 200: successObjectResponse }
        }
    },
        async (req, reply) => {

            const { id } = req.params as { id: number };

            const community = await expertPostService.getExpertPostById(id);

            reply.code(200).send({
                success: true,
                message: 'Expert Post fetched successfully',
                data: community,
            });

        });
    app.patch('/:id/status', {
        schema: {
            tags: ['Expert Posts'],
            summary: 'Toggle expert post status',
            params: expertPostIdParamsSchema,
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {

        const { id } = req.params as { id: number };
        const community = await expertPostService.expertPostStatus(id);
        return reply.send({ success: true, message: 'Expert Post status updated successfully', data: community });

    });
    app.post('/profession',
        {
            preHandler: [onlyOrg],
            schema: {
                tags: ['Expert Posts'],
                consumes: ['application/json', 'multipart/form-data'],
                summary: 'Create a profession',
                body: professionBody,
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { fields } = req.isMultipart()
                ? await app.parseMultipartMemory(req)
                : { fields: (req.body as Record<string, any>) ?? {} };
            const prData = {
                name: fields.name,
            };

            const PData = await expertPostService.createProfessions(prData);


            reply.code(200).send({
                success: true,
                message: 'Profession created successfully',
                data: PData,
            });

        });
    app.get('/professions',
        {
            schema: {
                tags: ['Expert Posts'],
                summary: 'List professions',
                response: { 200: successArrayResponse }
            }
        },
        async (req, reply) => {

            const professons = await expertPostService.getProfessions();
            reply.code(200).send({
                success: true,
                message: 'Expert Posts fetched successfully',
                data: professons,
            });

        });

}
