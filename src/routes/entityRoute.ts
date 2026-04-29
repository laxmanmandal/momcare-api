import { FastifyInstance, FastifyReply } from 'fastify';
import * as entityService from '../services/entityService';
import { authMiddleware } from '../middleware/auth';

const idParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: {
        id: { type: 'integer', minimum: 1 }
    }
} as const

const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true }
    }
} as const

const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object', additionalProperties: true } }
    }
} as const

const errorResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
    }
} as const

export default async function entityRoutes(app: FastifyInstance) {

    app.get(
        '/channel/list',
        {
            preHandler: [authMiddleware, app.accessControl.check('LIST_CHANNEL')],
            schema: {
                tags: ['Entities'],
                summary: 'List channel entities',
                response: { 200: successArrayResponse }
            }
        },
        async (req: any, reply) => {
            try {
                const payload = await entityService.getChannelEntity(req.user.belongsToId);
                reply.code(200).send({
                    success: true,
                    message: 'Entity fetched successfully',
                    data: payload,
                });
            } catch (error: any) {
                req.log.error(error);
                reply.send({
                    success: false,
                    message: 'Failed to fetch entity',
                    error: error.message,
                });
            }
        }
    );

    app.get(
        '/partner/list',
        {
            preHandler: [authMiddleware, app.accessControl.check('LIST_PARTNER')],
            schema: {
                tags: ['Entities'],
                summary: 'List partner entities',
                response: { 200: successArrayResponse }
            }
        },
        async (req: any, reply) => {
            try {
                const payload = await entityService.getPartnerEntity(req.user.belongsToId);
                reply.code(200).send({
                    success: true,
                    message: 'Entity fetched successfully',
                    data: payload,
                });
            } catch (error: any) {
                req.log.error(error);
                reply.send({
                    success: false,
                    message: 'Failed to fetch entity',
                    error: error.message,
                });
            }
        }
    );

    app.get(
        '/:id',
        {
            preHandler: [authMiddleware, app.accessControl.check('LIST_ENTITY')],
            schema: {
                tags: ['Entities'],
                summary: 'Get entity by ID',
                params: idParamsSchema,
                response: { 200: successObjectResponse }
            }
        },
        async (req: any, reply) => {
            const { id } = req.params as { id: number };
            try {
                const payload = await entityService.getentityTableById(id);
                reply.code(200).send({
                    success: true,
                    message: 'Entity fetched successfully',
                    data: payload,
                });
            } catch (error: any) {
                req.log.error(error);
                reply.send({
                    success: false,
                    message: 'Failed to fetch entity',
                    error: error.message,
                });
            }
        }
    );

    app.get(
        '/all',
        {
            preHandler: [authMiddleware, app.accessControl.check('LIST_ENTITY')],
            schema: {
                tags: ['Entities'],
                summary: 'List all entities',
                response: { 200: successArrayResponse }
            }
        },
        async (req: any, reply) => {
            try {
                const payload = await entityService.getAllentities(req.user.belongsToId);
                reply.code(200).send({
                    success: true,
                    message: 'Entity fetched successfully',
                    data: payload,
                });
            } catch (error: any) {
                req.log.error(error);
                reply.send({
                    success: false,
                    message: 'Failed to fetch entity',
                    error: error.message,
                });
            }
        }
    );

    const entityBody = {
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
    } as const

    app.post(
        '/create',
        {
            preHandler: [authMiddleware, app.accessControl.check('CREATE_ENTITY')],
            schema: {
                tags: ['Entities'],
                summary: 'Create an entity',
                body: entityBody,
                response: { 201: successObjectResponse }
            }
        },
        async (req: any, reply: FastifyReply) => {
            const body = req.body as any;
            const createdBy = (typeof req.body.id === 'number' ? req.body.id : null) ?? (req as any).user?.id;
            const belongsToId =
                req.user?.belongsToId !== undefined && req.user?.belongsToId !== null
                    ? Number(req.user.belongsToId)
                    : null;
            const isActive = body.isActive === undefined ? false : Boolean(body.isActive === 'true' || body.isActive === true);

            const createData: any = {
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

            const maybeFile = (req as any).files?.imageUrl ?? (req.body as any).imageUrl;
            let channel = await entityService.creatEntityTable(createData);

            if (maybeFile) {
                const f = Array.isArray(maybeFile) ? maybeFile[0] : maybeFile;
                if (typeof f === 'string') {
                    await entityService.updateEntityTable(Number(channel.id), { imageUrl: f });
                    channel = { ...channel, imageUrl: f };
                } else {
                    const imageUrl = await app.saveFileBuffer(f, 'Entities');
                    await entityService.updateEntityTable(Number(channel.id), { imageUrl });
                    channel = { ...channel, imageUrl };
                }
            }

            return reply.code(201).send({
                success: true,
                message: (req as any).user ? 'Entity created successfully' : 'Registered Successfully will contact Soon!',
                data: channel
            });
        }
    );

    app.post(
        '/register',
        {
            schema: {
                tags: ['Entities'],
                summary: 'Register a new entity (public)',
                body: entityBody,
                response: { 201: successObjectResponse }
            }
        },
        async (req: any, reply: FastifyReply) => {
            const body = req.body as any;
            const createdBy = (typeof req.body.id === 'number' ? req.body.id : null) ?? (req as any).user?.id;
            const belongsToId =
                body.belongsToId !== undefined && body.belongsToId !== null && body.belongsToId !== ''
                    ? Number(body.belongsToId)
                    : null;
            const isActive = body.isActive === undefined ? false : Boolean(body.isActive === 'true' || body.isActive === true);

            const createData: any = {
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

            const maybeFile = (req as any).files?.imageUrl ?? (req.body as any).imageUrl;
            let channel = await entityService.creatEntityTable(createData);

            if (maybeFile) {
                const f = Array.isArray(maybeFile) ? maybeFile[0] : maybeFile;
                if (typeof f === 'string') {
                    await entityService.updateEntityTable(Number(channel.id), { imageUrl: f });
                    channel = { ...channel, imageUrl: f };
                } else {
                    const imageUrl = await app.saveFileBuffer(f, 'Entities');
                    await entityService.updateEntityTable(Number(channel.id), { imageUrl });
                    channel = { ...channel, imageUrl };
                }
            }

            return reply.code(201).send({
                success: true,
                message: (req as any).user ? 'Entity created successfully' : 'Registered Successfully will contact Soon!',
                data: channel
            });
        }
    );

    app.patch(
        '/:id/update',
        {
            preHandler: [
                authMiddleware,
                app.accessControl.check('UPDATE_ENTITY')
            ],
            schema: {
                tags: ['Entities'],
                summary: 'Update an entity',
                params: idParamsSchema,
                body: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        type: { type: 'string' },
                        name: { type: 'string' },
                        phone: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        location: { type: 'string', nullable: true },
                        description: { type: 'string', nullable: true },
                        imageUrl: { type: 'string', nullable: true },
                        isActive: { type: 'boolean', nullable: true }
                    }
                },
                response: { 200: successObjectResponse, 400: errorResponse }
            }
        },
        async (req, reply) => {
            const id = (req.params as { id: number }).id;
            let fields: any = {};
            let files: any = {};

            if (req.isMultipart && req.isMultipart()) {
                const result = await app.parseMultipartMemory(req);
                fields = result.fields || {};
                files = result.files || {};
            } else {
                fields = req.body as object;
            }

            if (!fields || typeof fields !== 'object') {
                return reply.code(400).send({ message: 'Invalid body format' });
            }

            const updated = await entityService.updateEntityTable(id, fields);

            if (files.imageUrl?.length) {
                updated.imageUrl = await app.saveFileBuffer(
                    files.imageUrl[0],
                    `Entities`
                );
            }

            return reply.send({ success: true, message: 'Entity updated successfully', data: updated });
        }
    );
}
