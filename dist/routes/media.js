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
exports.default = mediaRoutes;
const mediaservice = __importStar(require("../services/mediaService"));
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
async function mediaRoutes(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    app.post('/', {
        schema: {
            tags: ['Media Files'],
            consumes: ['multipart/form-data'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.mediaCreateMultipartSchema),
            summary: 'Create a media resource',
            response: { 201: successObjectResponse }
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { fields, files } = (0, validations_1.validateData)(validations_1.mediaCreateMultipartSchema, await app.parseMultipartMemory(req));
        const mediaData = {
            uuid: await app.uid(fields.type, 'mediaResource'),
            title: fields.title,
            type: fields.type,
            mimeType: fields.mimeType ?? fields.mimetype,
        };
        if (files.url?.length) {
            mediaData.url = await app.saveFileBuffer(files.url[0], 'resources');
            mediaData.mimeType = files.url[0].mimetype;
        }
        else {
            mediaData.url = fields.url;
        }
        if (files.thumbnail?.length) {
            mediaData.thumbnail = await app.saveFileBuffer(files.thumbnail[0], 'resources');
        }
        else {
            mediaData.thumbnail = fields.thumbnail;
        }
        const media = await mediaservice.createMedia(mediaData);
        reply.code(201).send({ success: true, message: 'Media resource created successfully', data: media });
    });
    app.patch('/:uuid', {
        schema: {
            tags: ['Media Files'],
            consumes: ['application/json', 'multipart/form-data'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.mediaUpdateMultipartSchema),
            summary: 'Update a media resource',
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { uuid } = (0, validations_1.validateData)(validations_1.mediaParamsSchema, req.params);
        const { fields, files } = (0, validations_1.validateData)(validations_1.mediaUpdateMultipartSchema, await app.parseMultipartMemory(req));
        // Prepare update payload
        const updateData = {
            title: fields.title,
            type: fields.type,
            mimeType: fields.mimeType ?? fields.mimetype,
            url: undefined,
            thumbnail: undefined,
        };
        if (files.url?.length) {
            updateData.url = await app.saveFileBuffer(files.url[0], 'resources');
            updateData.mimeType = files.url[0].mimetype;
        }
        else {
            updateData.url = fields.url;
        }
        if (files.thumbnail?.length) {
            updateData.thumbnail = await app.saveFileBuffer(files.thumbnail[0], 'resources');
        }
        else {
            updateData.thumbnail = fields.thumbnail;
        }
        // Update database record
        const updatedmedia = await mediaservice.updateMedia(uuid, updateData);
        reply.code(200).send({
            success: true,
            message: 'media resource updated successfully',
            data: updatedmedia,
        });
    });
    app.get('/', {
        schema: {
            tags: ['Media Files'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'number', example: 1 },
                                    title: { type: 'string', example: 'title of the media' },
                                    uuid: { type: 'string', example: 'BG42334' },
                                    type: { type: 'string', example: 'image,pdf,video' },
                                    url: { type: 'string', example: '/resources/prenatal.jpg' },
                                    thumbnail: { type: 'string', example: '/resources/prenatal.jpg' },
                                    mimeType: { type: 'string', example: '4cm' },
                                    created_at: { type: 'string', example: '4cm' },
                                    updated_at: { type: 'string', example: 'data time format' }
                                },
                            },
                        },
                    },
                },
                500: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        error: { type: 'string' },
                    },
                },
            },
        },
    }, async (req, reply) => {
        try {
            const media = await mediaservice.getMedia();
            reply.code(200).send({
                success: true,
                message: 'media resources fetched successfully',
                data: media,
            });
        }
        catch (error) {
            req.log.error(error);
            reply.code(500).send({
                success: false,
                message: 'Failed to fetch media resources',
                error: error.message,
            });
        }
    });
    app.get('/:uuid', {
        schema: {
            tags: ['Media Files'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                id: { type: 'number', example: 1 },
                                title: { type: 'string', example: 'title of the media' },
                                uuid: { type: 'string', example: 'BG42334' },
                                type: { type: 'string', example: 'image,pdf,video' },
                                url: { type: 'string', example: '/prenatal.jpg' },
                                thumbnail: { type: 'string', example: '/prenatal.jpg' },
                                mimeType: { type: 'string', example: '4cm' },
                                createdAt: { type: 'string', format: 'date-time' },
                                updatedAt: { type: 'string', format: 'date-time' },
                            },
                        },
                    },
                },
                500: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        error: { type: 'string' },
                    },
                },
            },
        },
    }, async (req, reply) => {
        try {
            const { uuid } = (0, validations_1.validateData)(validations_1.mediaParamsSchema, req.params);
            const media = await mediaservice.getMediaByuuid(uuid);
            reply.code(200).send({
                success: true,
                message: 'media resource fetched successfully',
                data: media,
            });
        }
        catch (error) {
            req.log.error(error);
            reply.code(500).send({
                success: false,
                message: 'Failed to fetch media resource',
                error: error.message,
            });
        }
    });
    app.get('/mediaId/:id', {
        schema: {
            tags: ['Media Files'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                id: { type: 'number', example: 1 },
                                uuid: { type: 'string', example: 'BG42334' },
                                type: { type: 'string', example: 'image,pdf,video' },
                                url: { type: 'string', example: '/resources/prenatal.jpg' },
                                thumbnail: { type: 'string', example: '/resources/prenatal.jpg' },
                                mimeType: { type: 'string', example: '4cm' },
                                createdAt: { type: 'string', format: 'date-time' },
                                updatedAt: { type: 'string', format: 'date-time' },
                            },
                        },
                    },
                },
                500: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        error: { type: 'string' },
                    },
                },
            },
        },
    }, async (req, reply) => {
        try {
            const { id } = (0, validations_1.validateData)(validations_1.mediaIdParamsSchema, req.params);
            const media = await mediaservice.getMediaById(id);
            reply.code(200).send({
                success: true,
                message: 'media resource fetched successfully',
                data: media,
            });
        }
        catch (error) {
            req.log.error(error);
            reply.code(500).send({
                success: false,
                message: 'Failed to fetch media resource',
                error: error.message,
            });
        }
    });
    app.get('/search', {
        schema: {
            tags: ['Media Files'],
        }
    }, async (request, reply) => {
        try {
            const query = (0, validations_1.validateData)(validations_1.mediaSearchQuerySchema, request.query);
            const results = await mediaservice.search(query);
            return reply.send({ success: true, data: results });
        }
        catch (err) {
            console.error(err);
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
}
//# sourceMappingURL=media.js.map