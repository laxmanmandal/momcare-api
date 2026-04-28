import { FastifyInstance } from 'fastify'
import * as communityReactions from '../services/communityReactions'
import { authMiddleware } from '../middleware/auth';

export default async function communityReaction(app: FastifyInstance) {

    app.addHook('preHandler', authMiddleware);

    // ✅ Create / Update / Delete Reaction
    app.post(
        '/create',
        {
            schema: {
                tags: ['Community post and Comments Likes'],
                description: 'Toggle a reaction for either a post or a comment. Provide postId or commentId.',
                body: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        postId: { type: 'integer', minimum: 1 },
                        commentId: { type: 'integer', minimum: 1 },
                    }
                },
            }
        },
        async (req: any, reply) => {

            const { postId, commentId } = req.body as any;

            // Manual validation: require either postId or commentId
            if (!postId && !commentId) {
                return reply.code(400).send({
                    success: false,
                    message: "PostId or commentId are required"
                });
            }

            const result = await communityReactions.handleReaction({
                userId: Number(req.user.id),
                postId: postId ? Number(postId) : null,
                commentId: commentId ? Number(commentId) : null,
            });

            return reply.code(200).send({
                success: true,
                message: result.message,
                data: result.data
            });
        }
    );

    app.get(
        '/',
        {
            schema: {
                tags: ['Community post and Comments Likes'],
                querystring: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        postId: { type: 'integer', minimum: 1 },
                        commentId: { type: 'integer', minimum: 1 }
                    },
                    anyOf: [
                        { required: ['postId'] },
                        { required: ['commentId'] }
                    ]
                }
            }
        },
        async (req, reply) => {
            const { postId, commentId } = req.query as {
                postId?: number;
                commentId?: number;
            };

            const result = await communityReactions.getReaction(postId, commentId);

            return reply.code(200).send({
                success: true,
                data: result
            });
        }
    );

}
