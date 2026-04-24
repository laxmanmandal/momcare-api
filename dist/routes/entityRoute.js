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
async function entityRoutes(app) {
    app.get('/channel/list', {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('LIST_CHANNEL')],
        schema: { tags: ['Entities'] }
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
        schema: { tags: ['Entities'] }
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
        schema: { tags: ['Entities'] }
    }, async (req, reply) => {
        const { id } = req.params;
        const numericId = Number(id);
        try {
            const payload = await entityService.getentityTableById(numericId);
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
        preHandler: [auth_1.authMiddleware, app.accessControl.check('LIST_ENTITY')], schema: { tags: ['Entities'] }
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
    app.post('/create', {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('CREATE_ENTITY')],
        schema: {
            tags: ['Entities'],
            body: {
                type: 'object',
                required: ['name', 'type', 'email'],
                additionalProperties: false,
                properties: {
                    type: { type: 'string' },
                    name: { type: 'string' },
                    phone: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    location: { type: 'string', nullable: true },
                    description: { type: 'string', nullable: true },
                    imageUrl: { type: 'string', nullable: true },
                    createdBy: { type: 'number', nullable: true },
                    belongsToId: { type: 'number', nullable: true },
                    isActive: { type: 'boolean', nullable: true }
                }
            }
        }
    }, async (req, reply) => {
        const body = req.body;
        const createdBy = (typeof req.body.id === 'number' ? req.body.id : null) ?? req.user?.id;
        const belongsToId = Number(req.user.belongsToId);
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
        // if file exists in request.files or request.body (depending on plugin)
        const maybeFile = req.files?.imageUrl ?? req.body.imageUrl; // shape may vary
        let channel = await entityService.creatEntityTable(createData);
        if (maybeFile) {
            // if maybeFile is array or single object
            const f = Array.isArray(maybeFile) ? maybeFile[0] : maybeFile;
            const buffer = await f.toBuffer(); // depending on parser; check your parser API
            const imageUrl = await app.saveFileBuffer(buffer, 'Entities');
            await entityService.updateEntityTable(Number(channel.id), { imageUrl });
            channel = { ...channel, imageUrl };
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
            body: {
                type: 'object',
                required: ['name', 'type', 'email'],
                additionalProperties: false,
                properties: {
                    type: { type: 'string' },
                    name: { type: 'string' },
                    phone: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    location: { type: 'string', nullable: true },
                    description: { type: 'string', nullable: true },
                    imageUrl: { type: 'string', nullable: true },
                    createdBy: { type: 'number', nullable: true },
                    belongsToId: { type: 'number', nullable: true },
                    isActive: { type: 'boolean', nullable: true }
                }
            }
        }
    }, async (req, reply) => {
        const body = req.body;
        const createdBy = (typeof req.body.id === 'number' ? req.body.id : null) ?? req.user?.id;
        const belongsToId = req.user.belongsToId !== undefined && req.user.belongsToId !== '' ? Number(req.user.belongsToId) : null;
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
        // if file exists in request.files or request.body (depending on plugin)
        const maybeFile = req.files?.imageUrl ?? req.body.imageUrl; // shape may vary
        let channel = await entityService.creatEntityTable(createData);
        if (maybeFile) {
            // if maybeFile is array or single object
            const f = Array.isArray(maybeFile) ? maybeFile[0] : maybeFile;
            const buffer = await f.toBuffer(); // depending on parser; check your parser API
            const imageUrl = await app.saveFileBuffer(buffer, 'Entities');
            await entityService.updateEntityTable(Number(channel.id), { imageUrl });
            channel = { ...channel, imageUrl };
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
        schema: { tags: ['Entities'] }
    }, async (req, reply) => {
        const id = Number(req.params.id);
        let fields = {};
        let files = {};
        // Only parse multipart if content type is multipart/form-data
        if (req.isMultipart && req.isMultipart()) {
            const result = await app.parseMultipartMemory(req);
            fields = result.fields || {};
            files = result.files || {};
        }
        else {
            // not multipart — take JSON body directly
            fields = req.body;
        }
        // now fields has data regardless of content type
        if (!fields || typeof fields !== 'object') {
            return reply.code(400).send({ message: 'Invalid body format' });
        }
        // update entity
        const updated = await entityService.updateEntityTable(id, fields);
        // handle file upload separately
        if (files.imageUrl?.length) {
            updated.imageUrl = await app.saveFileBuffer(files.imageUrl[0], `Entities`);
        }
        return reply.send({ success: true, message: 'Entity updated successfully', data: updated });
    });
}
//# sourceMappingURL=entityRoute.js.map