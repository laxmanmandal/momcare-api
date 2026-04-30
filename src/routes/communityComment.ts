import { FastifyInstance } from 'fastify';
import * as communityComments from '../services/communityComments';
import { authMiddleware } from '../middleware/auth';
import { zodToJsonSchema } from '../utils/zodOpenApi';
import {
    communityCommentCreateSchema,
    communityCommentIdParamsSchema,
    communityCommentPostParamsSchema,
    communityCommentUpdateSchema,
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

const commentUpdateProps = {
    properties: {
        content: { type: 'string' }
    }
};

export default async function communityComment(app: FastifyInstance) {
    app.addHook('preHandler', authMiddleware);

    app.post(
        '/',
        {
            schema: {
                tags: ['Community Comments'],
                summary: 'Create a community comment',
                consumes: ['application/json', 'application/x-www-form-urlencoded'],
                body: zodToJsonSchema(communityCommentCreateSchema as any, { target: 'openApi3' }),
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { postId, userId, parentId, content } = validateData(communityCommentCreateSchema, req.body ?? {});
            const comment = await communityComments.createComment({
                postId,
                userId,
                parentId: parentId ?? null,
                content
            });

            reply.code(200).send({
                success: true,
                message: 'Comment posted successfully',
                data: comment
            });
        }
    );

    app.patch(
        '/:id',
        {
            schema: {
                tags: ['Community Comments'],
                summary: 'Update a community comment',
                consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
                body: commentUpdateProps,
                params: zodToJsonSchema(communityCommentIdParamsSchema as any, { target: 'openApi3' }),
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { id } = validateData(communityCommentIdParamsSchema, req.params);
            const { fields } = await app.parseMultipartMemory(req);
            const { content } = validateData(communityCommentUpdateSchema, req.isMultipart() ? fields : req.body ?? fields);

            const response = await communityComments.updateComment(id, { content });

            reply.code(200).send({
                success: true,
                message: 'community post updated successfully',
                data: response
            });
        }
    );

    app.get(
        '/:postId',
        {
            schema: {
                tags: ['Community Comments'],
                summary: 'List nested comments for a post',
                params: zodToJsonSchema(communityCommentPostParamsSchema as any, { target: 'openApi3' }),
                response: { 200: successArrayResponse }
            }
        },
        async (req, reply) => {
            const { postId } = validateData(communityCommentPostParamsSchema, req.params);
            const comment = await communityComments.getNestedComments(postId);

            reply.code(200).send({
                success: true,
                message: 'comment fetched successfully',
                data: comment
            });
        }
    );

    app.patch(
        '/:id/status',
        {
            schema: {
                tags: ['Community Comments'],
                summary: 'Toggle a community comment status',
                consumes: ['application/json', 'application/x-www-form-urlencoded'],
                params: zodToJsonSchema(communityCommentIdParamsSchema as any, { target: 'openApi3' }),
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { id } = validateData(communityCommentIdParamsSchema, req.params);
            const comment = await communityComments.CommentStatus(id);
            return reply.send({ success: true, message: 'comment removed successfully', data: comment });
        }
    );
}
