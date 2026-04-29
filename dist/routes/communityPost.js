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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = communityPost;
const communityService = __importStar(require("../services/communityPosts"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const http_errors_1 = __importDefault(require("http-errors"));
const requestValidation_1 = require("../utils/requestValidation");
// ================= SCHEMAS =================
const postIdParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: {
        id: { type: 'integer', minimum: 1 }
    }
};
const communityPostTypes = Object.values(client_1.PostType);
const postTypeParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['type'],
    properties: {
        type: { type: 'string', enum: communityPostTypes }
    }
};
const communityPostCreateBody = {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'content', 'communityId'],
    properties: {
        title: { type: 'string', minLength: 2, maxLength: 160 },
        content: { type: 'string', minLength: 2, maxLength: 10000 },
        communityId: { type: 'integer', minimum: 1 },
        userId: { type: 'integer', minimum: 1 },
        mediaType: { type: 'string', maxLength: 50 },
        type: { type: 'string', enum: communityPostTypes },
        media: { type: 'string', contentEncoding: 'binary' }
    }
};
const communityPostUpdateBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        title: { type: 'string', minLength: 2, maxLength: 160 },
        content: { type: 'string', minLength: 2, maxLength: 10000 },
        communityId: { type: 'integer', minimum: 1 },
        userId: { type: 'integer', minimum: 1 },
        mediaType: { type: 'string', maxLength: 50 },
        type: { type: 'string', enum: communityPostTypes },
        media: { type: 'string', contentEncoding: 'binary' }
    }
};
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
// ================= ROUTES =================
async function communityPost(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    // ================= CREATE =================
    app.post('/', {
        schema: {
            tags: ['Community Posts'],
            summary: 'Create a community post',
            consumes: ['multipart/form-data'],
            body: communityPostCreateBody,
            response: { 201: successObjectResponse }
        }
    }, async (req, reply) => {
        const { files, fields } = await app.parseMultipartMemory(req);
        (0, requestValidation_1.assertAllowedKeys)(fields, ['title', 'content', 'communityId', 'userId', 'mediaType', 'type']);
        (0, requestValidation_1.assertAllowedFileFields)(files, ['media']);
        const userId = (0, requestValidation_1.readIdParam)(req.user?.id, 'userId');
        if (fields.userId && Number(fields.userId) !== userId) {
            throw (0, http_errors_1.default)(403, 'Unauthorized user');
        }
        const payload = {
            title: (0, requestValidation_1.readString)(fields, 'title', { required: true, minLength: 2, maxLength: 160 }),
            content: (0, requestValidation_1.readString)(fields, 'content', { required: true, minLength: 2, maxLength: 10000 }),
            communityId: (0, requestValidation_1.readNumber)(fields, 'communityId', { required: true, integer: true, min: 1 }),
            userId,
            mediaType: (0, requestValidation_1.readString)(fields, 'mediaType', { maxLength: 50 }),
            type: (0, requestValidation_1.readEnumString)(fields, 'type', communityPostTypes),
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
    // ================= UPDATE =================
    app.patch('/:id', {
        schema: {
            tags: ['Community Posts'],
            summary: 'Update a community post',
            consumes: ['application/json', 'multipart/form-data'],
            params: postIdParamsSchema,
            body: communityPostUpdateBody,
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = req.params;
        let fields = {};
        let files = {};
        if (req.isMultipart()) {
            ({ fields, files } = await app.parseMultipartMemory(req));
        }
        else {
            fields = req.body;
        }
        (0, requestValidation_1.assertAllowedKeys)(fields, ['title', 'content', 'communityId', 'userId', 'mediaType', 'type']);
        (0, requestValidation_1.assertAllowedFileFields)(files, ['media']);
        const userId = (0, requestValidation_1.readIdParam)(req.user?.id, 'userId');
        if (fields.userId && Number(fields.userId) !== userId) {
            throw (0, http_errors_1.default)(403, 'Unauthorized user');
        }
        const payload = (0, requestValidation_1.pickDefined)({
            title: (0, requestValidation_1.readString)(fields, 'title', { minLength: 2, maxLength: 160 }),
            content: (0, requestValidation_1.readString)(fields, 'content', { minLength: 2, maxLength: 10000 }),
            communityId: (0, requestValidation_1.readNumber)(fields, 'communityId', { integer: true, min: 1 }),
            userId: fields.userId ? userId : undefined,
            mediaType: (0, requestValidation_1.readString)(fields, 'mediaType', { maxLength: 50 }),
            type: (0, requestValidation_1.readEnumString)(fields, 'type', communityPostTypes),
            media: undefined
        });
        (0, requestValidation_1.assertAtLeastOneDefined)(Object.entries(payload), 'Nothing to update');
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
    // ================= GET BY TYPE =================
    app.get('/', {
        schema: {
            tags: ['Community Posts'],
            summary: 'List all community posts',
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        const data = await communityService.getCommunityPost();
        return reply.send({
            success: true,
            data
        });
    });
    // ================= GET BY TYPE =================
    app.get('/type/:type', {
        schema: {
            tags: ['Community Posts'],
            summary: 'List community posts by type',
            params: postTypeParamsSchema,
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        const { type } = req.params;
        const data = await communityService.getPostByType(type);
        return reply.send({
            success: true,
            data
        });
    });
    // ================= USER POSTS =================
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
    // ================= BY COMMUNITY =================
    app.get('/community/:id', {
        schema: {
            tags: ['Community Posts'],
            summary: 'List community posts by community ID',
            params: postIdParamsSchema,
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        const { id } = req.params;
        const data = await communityService.getPostByCommunityId(id);
        return reply.send({
            success: true,
            data
        });
    });
    // ================= GET SINGLE =================
    app.get('/:id', {
        schema: {
            tags: ['Community Posts'],
            summary: 'Get a community post by ID',
            params: postIdParamsSchema,
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = req.params;
        const data = await communityService.getCommunityPostById(id);
        return reply.send({
            success: true,
            data
        });
    });
    // ================= STATUS =================
    app.patch('/:id/status', {
        schema: {
            tags: ['Community Posts'],
            summary: 'Toggle a community post status',
            params: postIdParamsSchema,
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = req.params;
        const data = await communityService.communityPostStatus(id);
        return reply.send({
            success: true,
            message: 'Status updated',
            data
        });
    });
}
//# sourceMappingURL=communityPost.js.map