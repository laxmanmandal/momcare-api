import { FastifyInstance } from 'fastify'
import * as communityComments from '../services/communityComments'
import { authMiddleware } from '../middleware/auth';

interface CommentBody {
    postId: number;
    userId: number;
    parentId?: number;
    content: string;
}

const idParamsSchema = {
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

export default async function communityComment(app: FastifyInstance) {
    app.addHook('preHandler', authMiddleware);

    app.post('/', {
        schema: {
            tags: ['Community Comments'],
            summary: 'Create a community comment',
            body: {
                type: 'object',
                required: ['postId', 'userId', 'content'],
                additionalProperties: false,
                properties: {
                    postId: { type: 'integer', minimum: 1 },
                    userId: { type: 'integer', minimum: 1 },
                    parentId: { type: 'integer', minimum: 1 },
                    content: { type: 'string' }
                }
            },
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {

        const { postId, userId, parentId, content } = req.body as CommentBody;

        const comment = await communityComments.createComment({
            postId: Number(postId),
            userId: Number(userId),
            parentId: parentId ? Number(parentId) : null,
            content,
        });

        reply.code(200).send({
            success: true,
            message: 'Comment posted successfully',
            data: comment,
        });

    });


    app.patch(
        '/:id', {
        schema: {
            tags: ['Community Comments'],
            summary: 'Update a community comment',
            params: idParamsSchema,
            body: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    postId: { type: 'integer', minimum: 1 },
                    userId: { type: 'integer', minimum: 1 },
                    parentId: { type: 'integer', minimum: 1 },
                    content: { type: 'string' }
                }
            },
            response: { 200: successObjectResponse }
        }
    },
        async (req, reply) => {

            const { id } = req.params as { id: string };

            // Parse form data (multipart or json)
            const { fields } = await app.parseMultipartMemory(req);
            if (!req.isMultipart() && req.body) Object.assign(fields, req.body);

            const comment = {
                content: fields.content,
            };

            const response = await communityComments.updateComment(Number(id), comment);

            reply.code(200).send({
                success: true,
                message: 'community post updated successfully',
                data: response,
            });

        }
    );

    app.get('/:postId', {
        schema: {
            tags: ['Community Comments'],
            summary: 'List nested comments for a post',
            params: postIdParamsSchema,
            response: { 200: successArrayResponse }
        },

    },
        async (req, reply) => {

            const { postId } = req.params as { postId: number };

            const comment = await communityComments.getNestedComments(postId);

            reply.code(200).send({
                success: true,
                message: 'comment fetched successfully',
                data: comment,
            });

        });
    app.patch('/:id/status', {
        schema: {
            tags: ['Community Comments'],
            summary: 'Toggle a community comment status',
            params: idParamsSchema,
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {

        const { id } = req.params as { id: number };
        const comment = await communityComments.CommentStatus(id);
        return reply.send({ success: true, message: 'comment removed successfully', data: comment });

    });
}
