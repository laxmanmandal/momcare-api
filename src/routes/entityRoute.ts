import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as entityService from '../services/entityService';
import { authMiddleware } from '../middleware/auth';

export default async function entityRoutes(app: FastifyInstance) {


    app.get(
        '/channel/list',
        {
            preHandler: [authMiddleware, app.accessControl.check('LIST_CHANNEL')],
            schema: { tags: ['Entities'] }
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
            schema: { tags: ['Entities'] }
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
            schema: { tags: ['Entities'] }

        },
        async (req: any, reply) => {
            const { id } = req.params as { id: string };
            const numericId = Number(id);
            try {
                const payload = await entityService.getentityTableById(numericId);
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

            preHandler: [authMiddleware, app.accessControl.check('LIST_ENTITY')], schema: { tags: ['Entities'] }

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
    app.post(
        '/create',
        {
            preHandler: [authMiddleware, app.accessControl.check('CREATE_ENTITY')],

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
        },
        async (req: any, reply: FastifyReply) => {
            const body = req.body as any;

            const createdBy = (typeof req.body.id === 'number' ? req.body.id : null) ?? (req as any).user?.id;
            const belongsToId = Number(req.user.belongsToId);
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

            // if file exists in request.files or request.body (depending on plugin)
            const maybeFile = (req as any).files?.imageUrl ?? (req.body as any).imageUrl; // shape may vary
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
        },
        async (req: any, reply: FastifyReply) => {
            const body = req.body as any;

            const createdBy = (typeof req.body.id === 'number' ? req.body.id : null) ?? (req as any).user?.id;
            const belongsToId = req.user.belongsToId !== undefined && req.user.belongsToId !== '' ? Number(req.user.belongsToId) : null;
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

            // if file exists in request.files or request.body (depending on plugin)
            const maybeFile = (req as any).files?.imageUrl ?? (req.body as any).imageUrl; // shape may vary
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
            schema: { tags: ['Entities'] }
        },
        async (req, reply) => {
            const id = Number((req.params as any).id);

            let fields: any = {};
            let files: any = {};

            // Only parse multipart if content type is multipart/form-data
            if (req.isMultipart && req.isMultipart()) {
                const result = await app.parseMultipartMemory(req);
                fields = result.fields || {};
                files = result.files || {};
            } else {
                // not multipart — take JSON body directly
                fields = req.body as object;
            }

            // now fields has data regardless of content type
            if (!fields || typeof fields !== 'object') {
                return reply.code(400).send({ message: 'Invalid body format' });
            }

            // update entity
            const updated = await entityService.updateEntityTable(id, fields);

            // handle file upload separately
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
