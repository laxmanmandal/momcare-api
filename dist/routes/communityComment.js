"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = communityComment;
const communityComments = __importStar(require("../services/communityComments"));
const auth_1 = require("../middleware/auth");
const zodOpenApi_1 = require("../utils/zodOpenApi");
const validations_1 = require("../validations");
const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true }
    }
};
const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object', additionalProperties: true } }
    }
};
const commentUpdateProps = {
    properties: {
        content: { type: 'string' }
    }
};
async function communityComment(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    app.post('/', {
        schema: {
            tags: ['Community Comments'],
            summary: 'Create a community comment',
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            body: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.communityCommentCreateSchema, { target: 'openApi3' }),
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { postId, userId, parentId, content } = (0, validations_1.validateData)(validations_1.communityCommentCreateSchema, req.body ?? {});
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
    });
    app.patch('/:id', {
        schema: {
            tags: ['Community Comments'],
            summary: 'Update a community comment',
            consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
            body: commentUpdateProps,
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.communityCommentIdParamsSchema, { target: 'openApi3' }),
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.communityCommentIdParamsSchema, req.params);
        const { fields } = await app.parseMultipartMemory(req);
        const { content } = (0, validations_1.validateData)(validations_1.communityCommentUpdateSchema, req.isMultipart() ? fields : req.body ?? fields);
        const response = await communityComments.updateComment(id, { content });
        reply.code(200).send({
            success: true,
            message: 'community post updated successfully',
            data: response
        });
    });
    app.get('/:postId', {
        schema: {
            tags: ['Community Comments'],
            summary: 'List nested comments for a post',
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.communityCommentPostParamsSchema, { target: 'openApi3' }),
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        const { postId } = (0, validations_1.validateData)(validations_1.communityCommentPostParamsSchema, req.params);
        const comment = await communityComments.getNestedComments(postId);
        reply.code(200).send({
            success: true,
            message: 'comment fetched successfully',
            data: comment
        });
    });
    app.patch('/:id/status', {
        schema: {
            tags: ['Community Comments'],
            summary: 'Toggle a community comment status',
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.communityCommentIdParamsSchema, { target: 'openApi3' }),
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.communityCommentIdParamsSchema, req.params);
        const comment = await communityComments.CommentStatus(id);
        return reply.send({ success: true, message: 'comment removed successfully', data: comment });
    });
}
//# sourceMappingURL=communityComment.js.map