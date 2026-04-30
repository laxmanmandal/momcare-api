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
async function resourceRoutes(app) {
    app.post('/conceive', {
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg],
        schema: {
            tags: ['Resources'],
            consumes: ['multipart/form-data'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.conceiveCreateMultipartSchema),
            body: {
                properties: {
                    week: { type: 'number' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    thumbnail: { type: 'string', format: 'binary' },
                    image: { type: 'string', format: 'binary' }
                }
            },
            summary: 'Create a conceive resource',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { fields, files } = (0, validations_1.validateData)(validations_1.conceiveCreateMultipartSchema, await app.parseMultipartMemory(req));
        const conceiveData = fields;
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
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.conceiveUpdateMultipartSchema),
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } },
                required: ['id']
            },
            body: {
                properties: {
                    week: { type: 'number' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    thumbnail: { type: 'string', format: 'binary' },
                    image: { type: 'string', format: 'binary' }
                }
            },
            summary: 'Update a conceive resource',
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.conceiveIdParamsSchema, req.params);
        const { fields, files } = (0, validations_1.validateData)(validations_1.conceiveUpdateMultipartSchema, await app.parseMultipartMemory(req));
        const updateData = fields;
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
            params: {
                type: 'object',
                properties: { type: { type: 'string' } },
                required: ['type']
            },
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
            const { type } = (0, validations_1.validateData)(validations_1.conceiveTypeParamsSchema, req.params);
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
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } },
                required: ['id']
            },
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
            const { id } = (0, validations_1.validateData)(validations_1.conceiveIdParamsSchema, req.params);
            const conceive = await resourceService.getConceiveById(id);
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