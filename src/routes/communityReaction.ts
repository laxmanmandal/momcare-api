import { FastifyInstance } from 'fastify'
import * as communityReactions from '../services/communityReactions'
import { authMiddleware } from '../middleware/auth';
import { zodToJsonSchema } from 'zod-to-json-schema'
import {
    communityReactionBodySchema,
    communityReactionQuerySchema,
    positiveIntSchema,
    validateData
} from '../validations';

export default async function communityReaction(app: FastifyInstance) {

    app.addHook('preHandler', authMiddleware);

    // ✅ Create / Update / Delete Reaction
    app.post(
        '/create',
        {
            schema: {
                tags: ['Community post and Comments Likes'],
                description: 'Toggle a reaction for either a post or a comment. Provide postId or commentId.',
                body: zodToJsonSchema(communityReactionBodySchema as any, 'communityReactionBody')
            }
        },

        async (req: any, reply) => {

            const { postId, commentId } = validateData(communityReactionBodySchema, req.body ?? {});
            const userId = validateData(positiveIntSchema, req.user.id);

            const result = await communityReactions.handleReaction({
                userId,
                postId: postId ?? null,
                commentId: commentId ?? null,
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
            }
        },
        async (req, reply) => {
            const { postId, commentId } = validateData(communityReactionQuerySchema, req.query ?? {});

            const result = await communityReactions.getReaction(postId, commentId);

            return reply.code(200).send({
                success: true,
                data: result
            });
        }
    );

}
