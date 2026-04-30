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
exports.default = entityRoutes;
const entityService = __importStar(require("../services/entityService"));
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
const errorResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
    }
};
async function entityRoutes(app) {
    app.get('/channel/list', {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('LIST_CHANNEL')],
        schema: {
            tags: ['Entities'],
            summary: 'List channel entities',
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        try {
            const payload = await entityService.getChannelEntity(req.user.belongsToId);
            reply.code(200).send({
                success: true,
                message: 'Entity fetched successfully',
                data: payload,
            });
        }
        catch (error) {
            req.log.error(error);
            reply.send({
                success: false,
                message: 'Failed to fetch entity',
                error: error.message,
            });
        }
    });
    app.get('/partner/list', {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('LIST_PARTNER')],
        schema: {
            tags: ['Entities'],
            summary: 'List partner entities',
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        try {
            const payload = await entityService.getPartnerEntity(req.user.belongsToId);
            reply.code(200).send({
                success: true,
                message: 'Entity fetched successfully',
                data: payload,
            });
        }
        catch (error) {
            req.log.error(error);
            reply.send({
                success: false,
                message: 'Failed to fetch entity',
                error: error.message,
            });
        }
    });
    app.get('/:id', {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('LIST_ENTITY')],
        schema: {
            tags: ['Entities'],
            summary: 'Get entity by ID',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.entityIdParamsSchema, req.params);
        try {
            const payload = await entityService.getentityTableById(id);
            reply.code(200).send({
                success: true,
                message: 'Entity fetched successfully',
                data: payload,
            });
        }
        catch (error) {
            req.log.error(error);
            reply.send({
                success: false,
                message: 'Failed to fetch entity',
                error: error.message,
            });
        }
    });
    app.get('/all', {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('LIST_ENTITY')],
        schema: {
            tags: ['Entities'],
            summary: 'List all entities',
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        try {
            const payload = await entityService.getAllentities(req.user.belongsToId);
            reply.code(200).send({
                success: true,
                message: 'Entity fetched successfully',
                data: payload,
            });
        }
        catch (error) {
            req.log.error(error);
            reply.send({
                success: false,
                message: 'Failed to fetch entity',
                error: error.message,
            });
        }
    });
    const entityBody = {
        type: 'object'
    };
    app.post('/create', {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('CREATE_ENTITY')],
        schema: {
            tags: ['Entities'],
            summary: 'Create an entity',
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.entityBodySchema),
            requestBody: (0, zodFormData_1.zodToMultipartRequestBody)(validations_1.entityBodySchema),
            response: { 201: successObjectResponse }
        }
    }, async (req, reply) => {
        const { fields, files } = await app.parseMultipartMemory(req);
        const body = (0, validations_1.validateData)(validations_1.entityBodySchema, req.isMultipart() ? fields : req.body ?? fields);
        const createdBy = (typeof req.body?.id === 'number' ? req.body.id : null) ?? req.user?.id;
        const belongsToId = req.user?.belongsToId !== undefined && req.user?.belongsToId !== null
            ? Number(req.user.belongsToId)
            : null;
        const isActive = body.isActive === undefined ? false : Boolean(body.isActive === 'true' || body.isActive === true);
        const createData = {
            type: body.type,
            name: body.name,
            email: body.email,
            phone: body.phone ?? null,
            location: body.location ?? '',
            description: body.description ?? null,
            imageUrl: null,
            createdBy,
            belongsToId,
            isActive
        };
        const maybeFile = files.imageUrl ?? req.body.imageUrl;
        let channel = await entityService.creatEntityTable(createData);
        if (maybeFile) {
            const f = Array.isArray(maybeFile) ? maybeFile[0] : maybeFile;
            if (typeof f === 'string') {
                await entityService.updateEntityTable(Number(channel.id), { imageUrl: f });
                channel = { ...channel, imageUrl: f };
            }
            else {
                const imageUrl = await app.saveFileBuffer(f, 'Entities');
                await entityService.updateEntityTable(Number(channel.id), { imageUrl });
                channel = { ...channel, imageUrl };
            }
        }
        return reply.code(201).send({
            success: true,
            message: req.user ? 'Entity created successfully' : 'Registered Successfully will contact Soon!',
            data: channel
        });
    });
    app.post('/register', {
        schema: {
            tags: ['Entities'],
            summary: 'Register a new entity (public)',
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.entityBodySchema),
            requestBody: (0, zodFormData_1.zodToMultipartRequestBody)(validations_1.entityBodySchema),
            response: { 201: successObjectResponse }
        }
    }, async (req, reply) => {
        const { fields, files } = await app.parseMultipartMemory(req);
        const body = (0, validations_1.validateData)(validations_1.entityBodySchema, req.isMultipart() ? fields : req.body ?? fields);
        const createdBy = (typeof req.body?.id === 'number' ? req.body.id : null) ?? req.user?.id;
        const belongsToId = body.belongsToId !== undefined && body.belongsToId !== null
            ? Number(body.belongsToId)
            : null;
        const isActive = body.isActive === undefined ? false : Boolean(body.isActive === 'true' || body.isActive === true);
        const createData = {
            type: body.type,
            name: body.name,
            email: body.email,
            phone: body.phone ?? null,
            location: body.location ?? '',
            description: body.description ?? null,
            imageUrl: null,
            createdBy,
            belongsToId,
            isActive
        };
        const maybeFile = files.imageUrl ?? req.body.imageUrl;
        let channel = await entityService.creatEntityTable(createData);
        if (maybeFile) {
            const f = Array.isArray(maybeFile) ? maybeFile[0] : maybeFile;
            if (typeof f === 'string') {
                await entityService.updateEntityTable(Number(channel.id), { imageUrl: f });
                channel = { ...channel, imageUrl: f };
            }
            else {
                const imageUrl = await app.saveFileBuffer(f, 'Entities');
                await entityService.updateEntityTable(Number(channel.id), { imageUrl });
                channel = { ...channel, imageUrl };
            }
        }
        return reply.code(201).send({
            success: true,
            message: req.user ? 'Entity created successfully' : 'Registered Successfully will contact Soon!',
            data: channel
        });
    });
    app.patch('/:id/update', {
        preHandler: [
            auth_1.authMiddleware,
            app.accessControl.check('UPDATE_ENTITY')
        ],
        schema: {
            tags: ['Entities'],
            summary: 'Update an entity',
            response: { 200: successObjectResponse, 400: errorResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.entityIdParamsSchema, req.params);
        const { fields, files } = await app.parseMultipartMemory(req);
        const body = (0, validations_1.validateData)(validations_1.entityUpdateSchema, req.isMultipart() ? fields : req.body ?? fields);
        const updated = await entityService.updateEntityTable(id, body);
        if (files.imageUrl?.length) {
            updated.imageUrl = await app.saveFileBuffer(files.imageUrl[0], `Entities`);
        }
        return reply.send({ success: true, message: 'Entity updated successfully', data: updated });
    });
}
//# sourceMappingURL=entityRoute.js.map