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
const communityPosts = __importStar(require("../services/communityPosts"));
const auth_1 = require("../middleware/auth");
async function communityPost(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    app.post('/', {
        preHandler: [auth_1.authMiddleware],
        schema: {
            tags: ['Community post'],
            consumes: ['multipart/form-data'],
            body: {
                type: 'object',
                required: ['title', 'content', 'communityId', 'userId', 'mediaType'],
                additionalProperties: false,
                properties: {
                    title: { type: 'string' },
                    content: { type: 'string' },
                    communityId: { type: 'integer', minimum: 1 },
                    userId: { type: 'integer', minimum: 1 },
                    mediaType: { type: 'string' },
                    media: { type: 'string', contentEncoding: 'binary' }
                }
            },
        }
    }, async (req, reply) => {
        const { files, fields } = await app.parseMultipartMemory(req);
        const community = {
            title: fields.title,
            content: fields.content,
            communityId: Number(fields.communityId),
            userId: Number(fields.userId),
            mediaType: fields.mediaType,
        };
        const communityData = await communityPosts.createCommunityPost(community);
        if (files.media?.length) {
            const media = await app.saveFileBuffer(files.media[0], 'community_posts');
            await communityPosts.updateCommunityPost(Number(communityData.id), { media });
            Object.assign(communityData, { media });
        }
        reply.code(200).send({
            success: true,
            message: 'Community post created successfully',
            data: communityData,
        });
    });
    app.patch('/:id', {
        schema: {
            tags: ['Community post'],
            consumes: ['application/json', 'multipart/form-data'],
            body: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    title: { type: 'string' },
                    content: { type: 'string' },
                    communityId: { type: 'integer', minimum: 1 },
                    userId: { type: 'integer', minimum: 1 },
                    mediaType: { type: 'string' },
                    media: { type: 'string', contentEncoding: 'binary' }
                }
            }
        }
    }, async (req, reply) => {
        const { id } = req.params;
        // Parse form data (multipart or json)
        const { files, fields } = await app.parseMultipartMemory(req);
        if (!req.isMultipart() && req.body)
            Object.assign(fields, req.body);
        // Prepare update payload
        const payload = {
            title: fields.title,
            content: fields.content,
            communityId: Number(fields.communityId),
            userId: fields.userId,
            mediaType: fields.mediaType,
            media: undefined
        };
        // Handle thumbnail upload (if provided)
        if (files.media?.length) {
            payload.media = await app.saveFileBuffer(files.media[0], `community_posts`);
        }
        // Update database record
        const communityData = await communityPosts.updateCommunityPost(Number(id), payload);
        reply.code(200).send({
            success: true,
            message: 'community post updated successfully',
            data: communityData,
        });
    });
    app.patch('/share/:postId', { schema: { tags: ['Community post'] } }, async (req, reply) => {
        const { postId } = req.params;
        // Update database record
        const communityData = await communityPosts.incrementShareCount(Number(postId));
        reply.code(200).send({
            success: true,
            message: 'community post updated successfully',
            data: communityData,
        });
    });
    app.patch('/view/:postId', { schema: { tags: ['Community post'] } }, async (req, reply) => {
        const { postId } = req.params;
        // Update database record
        const communityData = await communityPosts.incrementViewCount(Number(postId));
        reply.code(200).send({
            success: true,
            message: 'community post updated successfully',
            data: communityData,
        });
    });
    app.get('/', { schema: { tags: ['Community post'] } }, async (req, reply) => {
        const communities = await communityPosts.getCommunityPost();
        reply.code(200).send({
            success: true,
            message: 'community posts fetched successfully',
            data: communities,
        });
    });
    app.get('/type/:type', { schema: { tags: ['Community post'] } }, async (req, reply) => {
        const { type } = req.params;
        const communities = await communityPosts.getPostByType(type);
        reply.code(200).send({
            success: true,
            message: 'community posts fetched successfully',
            data: communities,
        });
    });
    app.get('/user/posts', { schema: { tags: ['Community post'] } }, async (req, reply) => {
        const communities = await communityPosts.getpostByUser();
        reply.code(200).send({
            success: true,
            message: 'community posts fetched successfully',
            data: communities,
        });
    });
    app.get('/communityId/:id', { schema: { tags: ['Community post'] } }, async (req, reply) => {
        const { id } = req.params;
        const numericId = Number(id);
        if (isNaN(numericId)) {
            return reply.code(500).send({
                success: false,
                message: 'Invalid ID',
            });
        }
        const community = await communityPosts.getpostByCommunityId(numericId);
        reply.code(200).send({
            success: true,
            message: 'community post fetched successfully',
            data: community,
        });
    });
    app.get('/:id', { schema: { tags: ['Community post'] } }, async (req, reply) => {
        const { id } = req.params;
        const numericId = Number(id);
        if (isNaN(numericId)) {
            return reply.code(500).send({
                success: false,
                message: 'Invalid ID',
            });
        }
        const community = await communityPosts.getCommunitypostById(numericId);
        reply.code(200).send({
            success: true,
            message: 'community post fetched successfully',
            data: community,
        });
    });
    app.patch('/:id/status', { schema: { tags: ['Community post'] } }, async (req, reply) => {
        const { id } = req.params;
        const community = await communityPosts.communityPostStatus(id);
        return reply.send({ success: true, message: 'Community post status updated successfully', data: community });
    });
}
//# sourceMappingURL=communityPost.js.map