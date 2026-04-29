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
exports.default = resourceRoutes;
const resourceService = __importStar(require("../services/resourceService"));
const auth_1 = require("../middleware/auth");
const conceiveBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        week: { type: 'integer', minimum: 1 },
        title: { type: 'string' },
        subtitle: { type: 'string' },
        type: { type: 'string' },
        description: { type: 'string' },
        height: { type: 'string' },
        weight: { type: 'string' },
        thumbnail: { type: 'string', contentEncoding: 'binary' },
        image: { type: 'string', contentEncoding: 'binary' }
    }
};
const conceiveIdParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: {
        id: { type: 'integer', minimum: 1 }
    }
};
const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object' }
    }
};
async function resourceRoutes(app) {
    app.post('/conceive', {
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg],
        schema: {
            tags: ['Resources'],
            consumes: ['multipart/form-data'],
            summary: 'Create a conceive resource',
            body: conceiveBody,
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { files, fields } = await app.parseMultipartMemory(req);
        // console.log(files);
        // return
        const conceiveData = {
            week: parseInt(fields.week),
            title: fields.title,
            subtitle: fields.subtitle,
            type: fields.type,
            description: fields.description,
            height: fields.height,
            weight: fields.weight
        };
        const conceive = await resourceService.createConceive(conceiveData);
        if (files.thumbnail?.length && files.image?.length) {
            const [thumbnail, image] = await Promise.all([
                app.saveFileBuffer(files.thumbnail[0], 'conceive'),
                app.saveFileBuffer(files.image[0], 'conceive')
            ]);
            await resourceService.updateConceive(conceive.id, { thumbnail, image });
            Object.assign(conceive, { thumbnail, image });
        }
        reply.code(200).send({
            success: true,
            message: 'Resource created successfully',
            data: conceive
        });
    });
    app.patch('/conceive/:id', {
        schema: {
            tags: ['Resources'],
            consumes: ['application/json', 'multipart/form-data'],
            summary: 'Update a conceive resource',
            params: conceiveIdParamsSchema,
            body: conceiveBody,
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = req.params;
        console.log('concive-update', id);
        // Parse form data (multipart or json)
        const { files, fields } = await app.parseMultipartMemory(req);
        if (!req.isMultipart() && req.body)
            Object.assign(fields, req.body);
        // Prepare update payload
        const updateData = {
            week: fields.week ? parseInt(fields.week) : undefined,
            title: fields.title || undefined,
            subtitle: fields.subtitle || undefined,
            type: fields.type || undefined,
            description: fields.description || undefined,
            height: fields.height || undefined,
            weight: fields.weight || undefined,
        };
        // Handle thumbnail upload (if provided)
        if (files.thumbnail?.length) {
            updateData.thumbnail = await app.saveFileBuffer(files.thumbnail[0], `conceive`);
        }
        // Handle image upload (if provided)
        if (files.image?.length) {
            updateData.image = await app.saveFileBuffer(files.image[0], `conceive`);
        }
        // Update database record
        const updatedConceive = await resourceService.updateConceive(Number(id), updateData);
        reply.code(200).send({
            success: true,
            message: 'Resource updated successfully',
            data: updatedConceive,
        });
    });
    app.get('/conceive/type/:type', {
        preHandler: [auth_1.authMiddleware],
        schema: {
            tags: ['Resources'],
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
                                    week: { type: 'number', example: 3 },
                                    title: { type: 'string', example: 'Prenatal Guide' },
                                    subtitle: { type: 'string', example: 'Prenatal Guide subtitle' },
                                    description: { type: 'string', example: 'Prenatal Guide description' },
                                    thumbnail: { type: 'string', example: '/conceive/prenatal.jpg' },
                                    image: { type: 'string', example: '/conceive/prenatal.jpg' },
                                    height: { type: 'string', example: '4cm' },
                                    weight: { type: 'string', example: '6gm' },
                                    created_at: { type: 'string', format: 'date-time' },
                                    updated_at: { type: 'string', format: 'date-time' },
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
            const { type } = req.params;
            const conceive = await resourceService.getConceive(type);
            reply.code(200).send({
                success: true,
                message: 'Resources fetched successfully',
                data: conceive,
            });
        }
        catch (error) {
            req.log.error(error);
            reply.code(500).send({
                success: false,
                message: 'Failed to fetch Resources',
                error: error.message,
            });
        }
    });
    app.get('/conceive/:id', {
        preHandler: [auth_1.authMiddleware],
        schema: {
            tags: ['Resources'],
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
                                week: { type: 'number', example: 3 },
                                title: { type: 'string', example: 'Prenatal Guide' },
                                subtitle: { type: 'string', example: 'Prenatal Guide' },
                                description: { type: 'string', example: 'Prenatal Guide description' },
                                thumbnail: { type: 'string', example: '/conceive/prenatal.jpg' },
                                image: { type: 'string', example: '/conceive/prenatal.jpg' },
                                height: { type: 'string', example: '4cm' },
                                weight: { type: 'string', example: '6gm' },
                                created_at: { type: 'string', format: 'date-time' },
                                updated_at: { type: 'string', format: 'date-time' },
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
            const { id } = req.params;
            const numericId = Number(id);
            if (isNaN(numericId)) {
                return reply.code(500).send({
                    success: false,
                    message: 'Invalid ID',
                });
            }
            const conceive = await resourceService.getConceiveById(numericId);
            reply.code(200).send({
                success: true,
                message: 'Resource fetched successfully',
                data: conceive,
            });
        }
        catch (error) {
            req.log.error(error);
            reply.code(500).send({
                success: false,
                message: 'Failed to fetch Resource',
                error: error.message,
            });
        }
    });
}
//# sourceMappingURL=resources.js.map