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
async function expertPost(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    app.post('/', {
        schema: {
            tags: ['Expert Posts'],
            consumes: ['multipart/form-data'],
            summary: 'Create an expert post',
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.expertPostCreateMultipartSchema),
            requestBody: (0, zodFormData_1.zodToMultipartRequestBody)(validations_1.expertPostCreateMultipartSchema),
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { fields, files } = (0, validations_1.validateData)(validations_1.expertPostCreateMultipartSchema, await app.parseMultipartMemory(req));
        const post = {
            title: fields.title,
            content: fields.content,
            expert_id: fields.expert_id,
            mediaType: fields.mediaType
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
            consumes: ['application/json', 'multipart/form-data'],
            summary: 'Update an expert post',
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.expertPostUpdateMultipartSchema),
            requestBody: (0, zodFormData_1.zodToMultipartRequestBody)(validations_1.expertPostUpdateMultipartSchema),
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
            media: undefined
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
            response: { 200: successArrayResponse }
        }
    }, async () => {
        const communities = await expertPostService.getExpertPost();
        return {
            success: true,
            message: 'Expert Posts fetched successfully',
            data: communities,
        };
    });
    app.get('/profession/:professionId', {
        schema: {
            tags: ['Expert Posts'],
            summary: 'List expert posts by profession ID',
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        const { professionId } = (0, validations_1.validateData)(validations_1.expertProfessionParamsSchema, req.params);
        const posts = await expertPostService.getExpertPostByProfessionId(professionId);
        reply.code(200).send({
            success: true,
            message: 'Expert Posts fetched successfully',
            data: posts
        });
    });
    app.get('/:id', {
        schema: {
            tags: ['Expert Posts'],
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
    app.patch('/:id/status', {
        schema: {
            tags: ['Expert Posts'],
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
            consumes: ['application/json', 'multipart/form-data'],
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
}
//# sourceMappingURL=expertPost.js.map