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
exports.default = expertPost;
const expertPostService = __importStar(require("../services/expertPostService"));
const auth_1 = require("../middleware/auth");
const zodOpenApi_1 = require("../utils/zodOpenApi");
const validations_1 = require("../validations");
const zod_1 = require("zod");
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
const paginatedResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object', additionalProperties: true } },
        total: { type: 'integer' },
        page: { type: 'integer' },
        limit: { type: 'integer' },
        totalPages: { type: 'integer' }
    }
};
const paginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).optional(),
    limit: zod_1.z.coerce.number().min(1).max(100).optional(),
});
const expertPostQuerySchema = paginationQuerySchema.extend({
    search: zod_1.z.string().optional(),
    communityId: zod_1.z.coerce.number().optional(),
    professionId: zod_1.z.coerce.number().optional(),
    isFeatured: zod_1.z.enum(['true', 'false']).optional(),
    isActive: zod_1.z.enum(['true', 'false']).optional(),
    expert_id: zod_1.z.coerce.number().optional(),
    mediaType: zod_1.z.string().optional(),
    sortField: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
});
async function expertPost(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    app.post('/', {
        schema: {
            tags: ['Expert Posts'],
            consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
            body: (0, validations_1.zodToSwagger)(validations_1.expertPostCreateMultipartSchema),
            summary: 'Create an expert post',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { fields, files } = (0, validations_1.validateData)(validations_1.expertPostCreateMultipartSchema, await app.parseMultipartMemory(req));
        const post = {
            title: fields.title,
            content: fields.content,
            expert_id: fields.expert_id,
            mediaType: fields.mediaType,
            communityId: fields.communityId ? Number(fields.communityId) : undefined,
            isFeatured: fields.isFeatured !== undefined ? String(fields.isFeatured) === 'true' : false
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
    app.patch('/:id', {
        schema: {
            tags: ['Expert Posts'],
            consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
            body: (0, validations_1.zodToSwagger)(validations_1.expertPostUpdateMultipartSchema),
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.expertPostIdParamsSchema, { target: 'openApi3' }),
            summary: 'Update an expert post',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.expertPostIdParamsSchema, req.params);
        const { files, fields } = await app.parseMultipartMemory(req);
        if (!req.isMultipart() && req.body)
            Object.assign(fields, req.body);
        const payload = {
            title: fields.title,
            content: fields.content,
            expert_id: Number(fields.expert_id),
            mediaType: fields.mediaType,
            media: undefined,
            communityId: fields.communityId ? Number(fields.communityId) : undefined,
            isFeatured: fields.isFeatured !== undefined ? String(fields.isFeatured) === 'true' : undefined
        };
        if (files.media?.length) {
            payload.media = await app.saveFileBuffer(files.media[0], `_expert_posts`);
        }
        const expertPostData = await expertPostService.updateExpertPost(Number(id), payload);
        reply.code(200).send({
            success: true,
            message: 'Expert Post updated successfully',
            data: expertPostData,
        });
    });
    app.patch('/share/:postId', {
        schema: {
            tags: ['Expert Posts'],
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.expertPostShareParamsSchema, { target: 'openApi3' }),
            summary: 'Increment expert post share count',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { postId } = (0, validations_1.validateData)(validations_1.expertPostShareParamsSchema, req.params);
        const communityData = await expertPostService.incrementShareCount(postId);
        reply.code(200).send({
            success: true,
            message: 'Expert Post updated successfully',
            data: communityData,
        });
    });
    app.patch('/view/:postId', {
        schema: {
            tags: ['Expert Posts'],
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.expertPostShareParamsSchema, { target: 'openApi3' }),
            summary: 'Increment expert post view count',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { postId } = (0, validations_1.validateData)(validations_1.expertPostShareParamsSchema, req.params);
        const communityData = await expertPostService.incrementViewCount(postId);
        reply.code(200).send({
            success: true,
            message: 'Expert Post updated successfully',
            data: communityData,
        });
    });
    app.get('/', {
        schema: {
            tags: ['Expert Posts'],
            summary: 'List expert posts',
            querystring: (0, zodOpenApi_1.zodToJsonSchema)(expertPostQuerySchema, { target: 'openApi3' }),
            response: { 200: paginatedResponse }
        }
    }, async (req, reply) => {
        const query = (0, validations_1.validateData)(expertPostQuerySchema, req.query ?? {});
        const result = await expertPostService.getExpertPost(query);
        return reply.code(200).send({
            success: true,
            message: 'Expert Posts fetched successfully',
            ...result,
        });
    });
    app.get('/profession/:professionId', {
        schema: {
            tags: ['Expert Posts'],
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.expertProfessionParamsSchema, { target: 'openApi3' }),
            querystring: (0, zodOpenApi_1.zodToJsonSchema)(paginationQuerySchema, { target: 'openApi3' }),
            summary: 'List expert posts by profession ID',
            response: { 200: paginatedResponse }
        }
    }, async (req, reply) => {
        const { professionId } = (0, validations_1.validateData)(validations_1.expertProfessionParamsSchema, req.params);
        const query = (0, validations_1.validateData)(paginationQuerySchema, req.query ?? {});
        const posts = await expertPostService.getExpertPostByProfessionId(professionId, query);
        reply.code(200).send({
            success: true,
            message: 'Expert Posts fetched successfully',
            ...posts
        });
    });
    app.get('/:id', {
        schema: {
            tags: ['Expert Posts'],
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.expertPostIdParamsSchema, { target: 'openApi3' }),
            summary: 'Get expert post by ID',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.expertPostIdParamsSchema, req.params);
        const community = await expertPostService.getExpertPostById(id);
        reply.code(200).send({
            success: true,
            message: 'Expert Post fetched successfully',
            data: community,
        });
    });
    app.get('/community/:id', {
        schema: {
            tags: ['Expert Posts'],
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.expertPostIdParamsSchema, { target: 'openApi3' }),
            querystring: (0, zodOpenApi_1.zodToJsonSchema)(paginationQuerySchema, { target: 'openApi3' }),
            summary: 'List expert posts by community ID',
            response: { 200: paginatedResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.expertPostIdParamsSchema, req.params);
        const query = (0, validations_1.validateData)(paginationQuerySchema, req.query ?? {});
        const posts = await expertPostService.getExpertPostByCommunityId(id, query);
        return reply.code(200).send({
            success: true,
            message: 'Expert Posts fetched successfully',
            ...posts
        });
    });
    app.patch('/:id/status', {
        schema: {
            tags: ['Expert Posts'],
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.expertPostIdParamsSchema, { target: 'openApi3' }),
            summary: 'Toggle expert post status',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.expertPostIdParamsSchema, req.params);
        const community = await expertPostService.expertPostStatus(id);
        return reply.send({ success: true, message: 'Expert Post status updated successfully', data: community });
    });
    app.post('/profession', {
        preHandler: [auth_1.onlyOrg],
        schema: {
            tags: ['Expert Posts'],
            consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
            body: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.professionCreateSchema, { target: 'openApi3' }),
            summary: 'Create a profession',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { fields } = req.isMultipart()
            ? await app.parseMultipartMemory(req)
            : { fields: req.body ?? {} };
        const { name } = (0, validations_1.validateData)(validations_1.professionCreateSchema, fields);
        const PData = await expertPostService.createProfessions({ name });
        reply.code(200).send({
            success: true,
            message: 'Profession created successfully',
            data: PData,
        });
    });
    app.get('/professions', {
        schema: {
            tags: ['Expert Posts'],
            summary: 'List professions',
            response: { 200: successArrayResponse }
        }
    }, async () => {
        const professons = await expertPostService.getProfessions();
        return {
            success: true,
            message: 'Expert Posts fetched successfully',
            data: professons,
        };
    });
    app.get('/professions/:id', {
        schema: {
            tags: ['Expert Posts'],
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.expertPostIdParamsSchema, { target: 'openApi3' }),
            summary: 'Get profession by ID',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.expertPostIdParamsSchema, req.params);
        const profession = await expertPostService.getProfessionById(id);
        reply.code(200).send({
            success: true,
            message: 'Profession fetched successfully',
            data: profession,
        });
    });
    app.patch('/professions/:id', {
        preHandler: [auth_1.onlyOrg],
        schema: {
            tags: ['Expert Posts'],
            consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.expertPostIdParamsSchema, { target: 'openApi3' }),
            body: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.professionCreateSchema, { target: 'openApi3' }),
            summary: 'Update a profession',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.expertPostIdParamsSchema, req.params);
        const { fields } = req.isMultipart()
            ? await app.parseMultipartMemory(req)
            : { fields: req.body ?? {} };
        const { name } = (0, validations_1.validateData)(validations_1.professionCreateSchema, fields);
        const profession = await expertPostService.updateProfession(id, { name });
        reply.code(200).send({
            success: true,
            message: 'Profession updated successfully',
            data: profession,
        });
    });
}
//# sourceMappingURL=expertPost.js.map