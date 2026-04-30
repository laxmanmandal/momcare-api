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
exports.default = ExpertRoutes;
const expertService = __importStar(require("../services/expertService"));
const auth_1 = require("../middleware/auth");
const validations_1 = require("../validations");
const expertBody = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        profession_id: { type: 'integer', minimum: 1 },
        name_org: { type: 'string' },
        qualification: { type: 'string' },
        image: { type: 'string', contentEncoding: 'binary' }
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
async function ExpertRoutes(app) {
    app.post('/', {
        schema: {
            tags: ['Experts'],
            consumes: ['multipart/form-data'],
            summary: 'Create an expert',
            parameters: [
                { name: 'name', in: 'formData', type: 'string', required: true },
                { name: 'profession_id', in: 'formData', type: 'integer', required: true },
                { name: 'name_org', in: 'formData', type: 'string', required: false },
                { name: 'qualification', in: 'formData', type: 'string', required: false },
                { name: 'image', in: 'formData', type: 'file', required: false }
            ],
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { fields, files } = await app.parseMultipartMemory(req);
        const expertsData = {
            name: fields.name,
            profession_id: Number(fields.profession_id),
            name_org: fields.name_org,
            qualification: fields.qualification,
        };
        const expert = await expertService.createExperts(expertsData);
        if (files.image?.length) {
            const image = await app.saveFileBuffer(files.image[0], '_experts');
            await expertService.updateexperts(Number(expert.id), { image });
            Object.assign(expert, { image });
        }
        reply.code(200).send({
            success: true,
            message: 'Expert created successfully',
            data: expert,
        });
    });
    app.patch('/:id', {
        schema: {
            tags: ['Experts'],
            consumes: ['application/json', 'multipart/form-data'],
            summary: 'Update an expert',
            parameters: [
                { name: 'name', in: 'formData', type: 'string', required: false },
                { name: 'profession_id', in: 'formData', type: 'integer', required: false },
                { name: 'name_org', in: 'formData', type: 'string', required: false },
                { name: 'qualification', in: 'formData', type: 'string', required: false },
                { name: 'image', in: 'formData', type: 'file', required: false }
            ],
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.expertIdParamsSchema, req.params);
        const { files, fields } = await app.parseMultipartMemory(req);
        if (!req.isMultipart() && req.body)
            Object.assign(fields, req.body);
        const updateData = {
            name: fields.name,
            profession_id: Number(fields.profession_id),
            name_org: fields.name_org,
            qualification: fields.qualification,
        };
        if (files.image?.length) {
            updateData.image = await app.saveFileBuffer(files.image[0], `_experts`);
        }
        const updatedExpert = await expertService.updateexperts(Number(id), updateData);
        reply.code(200).send({
            success: true,
            message: 'Expert updated successfully',
            data: updatedExpert,
        });
    });
    app.get('/', {
        schema: {
            tags: ['Experts'],
            summary: 'List experts',
            response: { 200: successArrayResponse }
        },
        preHandler: [auth_1.authMiddleware]
    }, async () => {
        const Expert = await expertService.getexperts();
        return {
            success: true,
            message: 'Expert fetched successfully',
            data: Expert,
        };
    });
    app.get('/:id', {
        schema: {
            tags: ['Experts'],
            summary: 'Get expert by ID',
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware]
    }, async (req) => {
        const { id } = (0, validations_1.validateData)(validations_1.expertIdParamsSchema, req.params);
        const Expert = await expertService.getexpertsById(id);
        return {
            success: true,
            message: 'Expert fetched successfully',
            data: Expert,
        };
    });
}
//# sourceMappingURL=expertRoute.js.map