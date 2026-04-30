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
exports.default = communityPost;
const communityService = __importStar(require("../services/communityPosts"));
const auth_1 = require("../middleware/auth");
const validations_1 = require("../validations");
const zodFormData_1 = require("../utils/zodFormData");
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
async function communityPost(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    app.post('/', {
        schema: {
            tags: ['Community Posts'],
            summary: 'Create a community post',
            consumes: ['multipart/form-data'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.communityPostCreateMultipartSchema),
            response: { 201: successObjectResponse }
        }
    }, async (req, reply) => {
        const { fields, files } = (0, validations_1.validateData)(validations_1.communityPostCreateMultipartSchema, await app.parseMultipartMemory(req));
        const userId = (0, validations_1.validateData)(validations_1.positiveIntSchema, req.user?.id);
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
        const data = await communityService.createCommunityPost(payload);
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
    });
    app.patch('/:id', {
        schema: {
            tags: ['Community Posts'],
            summary: 'Update a community post',
            consumes: ['application/json', 'multipart/form-data'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.communityPostUpdateMultipartSchema),
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.communityPostIdParamsSchema, req.params);
        const { fields, files } = (0, validations_1.validateData)(validations_1.communityPostUpdateMultipartSchema, await app.parseMultipartMemory(req));
        const userId = (0, validations_1.validateData)(validations_1.positiveIntSchema, req.user?.id);
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
            userId: fields.userId !== undefined ? userId : undefined,
            mediaType: fields.mediaType,
            type: fields.type,
            media: undefined
        };
        if (files.media?.length) {
            payload.media = await app.saveFileBuffer(files.media[0], 'community_posts');
        }
        const data = await communityService.updateCommunityPost(id, payload);
        return reply.send({
            success: true,
            message: 'Post updated',
            data
        });
    });
    app.get('/', {
        schema: {
            tags: ['Community Posts'],
            summary: 'List all community posts',
            response: { 200: successArrayResponse }
        }
    }, async (_req, reply) => {
        const data = await communityService.getCommunityPost();
        return reply.send({
            success: true,
            data
        });
    });
    app.get('/type/:type', {
        schema: {
            tags: ['Community Posts'],
            summary: 'List community posts by type',
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        const { type } = (0, validations_1.validateData)(validations_1.communityPostTypeParamsSchema, req.params);
        const data = await communityService.getPostByType(type);
        return reply.send({
            success: true,
            data
        });
    });
    app.get('/user/posts', {
        schema: {
            tags: ['Community Posts'],
            summary: 'List community posts for the authenticated user',
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        const data = await communityService.getPostByUser(req.user?.id);
        return reply.send({
            success: true,
            data
        });
    });
    app.get('/community/:id', {
        schema: {
            tags: ['Community Posts'],
            summary: 'List community posts by community ID',
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.communityPostIdParamsSchema, req.params);
        const data = await communityService.getPostByCommunityId(id);
        return reply.send({
            success: true,
            data
        });
    });
    app.get('/:id', {
        schema: {
            tags: ['Community Posts'],
            summary: 'Get a community post by ID',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.communityPostIdParamsSchema, req.params);
        const data = await communityService.getCommunityPostById(id);
        return reply.send({
            success: true,
            data
        });
    });
    app.patch('/:id/status', {
        schema: {
            tags: ['Community Posts'],
            summary: 'Toggle a community post status',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.communityPostIdParamsSchema, req.params);
        const data = await communityService.communityPostStatus(id);
        return reply.send({
            success: true,
            message: 'Status updated',
            data
        });
    });
}
//# sourceMappingURL=communityPost.js.map