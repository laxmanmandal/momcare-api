import { FastifyInstance } from 'fastify'
import * as communityComments from '../services/communityComments'
import { authMiddleware } from '../middleware/auth';

interface CommentBody {
    postId: number;
    userId: number;
    parentId?: number;
    content: string;
}

export default async function communityComment(app: FastifyInstance) {
    app.addHook('preHandler', authMiddleware);

    app.post('/', {
        schema: {
            tags: ['Community Comments'],

            body: {
                type: 'object',
                required: ['postId', 'userId', 'content'],
                additionalProperties: false,
                properties: {
                    postId: { type: 'integer', minLength: 1 },
                    userId: { type: 'integer', minLength: 1 },
                    partentId: { type: 'integer', minLength: 1 },
                    content: { type: 'string' }
                }
            },
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
            body: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    postId: { type: 'integer', minLength: 1 },
                    userId: { type: 'integer', minLength: 1 },
                    partentId: { type: 'integer', minLength: 1 },
                    content: { type: 'string' }
                }
            },
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
        schema:
            { tags: ['Community Comments'] },

    },
        async (req, reply) => {

            const { postId } = req.params as { postId: string };
            const numericId = Number(postId);
            console.log(postId);

            if (isNaN(numericId)) {
                return reply.code(500).send({
                    success: false,
                    message: 'Invalid ID',
                });
            }

            const comment = await communityComments.getNestedComments(numericId);

            reply.code(200).send({
                success: true,
                message: 'comment fetched successfully',
                data: comment,
            });

        });
    app.patch('/:id/status', { schema: { tags: ['Community Comments'] } }, async (req, reply) => {

        const { id } = req.params as { id: number };
        const comment = await communityComments.CommentStatus(id);
        return reply.send({ success: true, message: 'comment removed successfully', data: comment });

    });
}