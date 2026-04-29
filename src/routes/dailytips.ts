import { FastifyInstance } from 'fastify'
import * as dailytipService from '../services/dailytipService'
import { authMiddleware, onlyOrg } from '../middleware/auth';

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
        data: { type: 'object' }
    }
} as const

const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object' } }
    }
} as const

const dailyTipsBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        title: { type: 'string' },
        heading: { type: 'string' },
        subheading: { type: 'string' },
        content: { type: 'string' },
        category: { type: 'string' },
        icon: { type: 'string', contentEncoding: 'binary' }
    }
} as const

export default async function dailytipsRoute(app: FastifyInstance) {

    app.post('/',
        {
            schema: {
                tags: ['Dailytips'],
                summary: 'Create a daily tip',
                consumes: ['multipart/form-data'],
                body: dailyTipsBody,
                response: { 200: successObjectResponse }
            },
            preHandler: [authMiddleware, onlyOrg]
        }, async (req: any, reply) => {

            const { files, fields } = await app.parseMultipartMemory(req);
            const dailytipsData = {
                title: fields.title,
                heading: fields.heading,
                subheading: fields.subheading,
                content: fields.content,
                category: fields.category,
                creator: req.user.name
            };

            const dailytips = await dailytipService.createdailyTips(dailytipsData);

            if (files.icon?.length) {
                const icon = await app.saveFileBuffer(files.icon[0], 'daily-tips');
                await dailytipService.updatedailyTips(Number(dailytips.id), { icon });
                Object.assign(dailytips, { icon });
            }

            reply.code(200).send({
                success: true,
                message: 'dailytips created successfully',
                data: dailytips,
            });

        });

    app.patch(
        '/:id', {
        schema: {
            tags: ['Dailytips'],
            summary: 'Update a daily tip',
            consumes: ['application/json', 'multipart/form-data'],
            params: idParamsSchema,
            body: dailyTipsBody,
            response: { 200: successObjectResponse }
        }, preHandler: [authMiddleware, onlyOrg]
    },
        async (req, reply) => {

            const { id } = req.params as { id: number };
            let fields: any = {};
            let files: any = {};

            if (req.isMultipart()) {
                ({ files, fields } = await app.parseMultipartMemory(req));
            } else {
                fields = (req.body as any) || {};
            }

            const updateData: any = {
                title: fields.title,
                heading: fields.heading,
                subheading: fields.subheading,
                content: fields.content,
                category: fields.category,
            };

            if (files.icon?.length) {
                updateData.icon = await app.saveFileBuffer(
                    files.icon[0],
                    `daily-tips`
                );
            }
            const updateddailytips = await dailytipService.updatedailyTips(id, updateData);

            reply.code(200).send({
                success: true,
                message: 'dailytips updated successfully',
                data: updateddailytips,
            });

        }
    );

    app.get('/', {
        schema: {
            tags: ['Dailytips'],
            summary: 'List all daily tips',
            response: { 200: successArrayResponse }
        },
        preHandler: [authMiddleware]
    },
        async (req, reply) => {

            const dailytips = await dailytipService.getdailyTips();
            reply.code(200).send({
                success: true,
                message: 'dailytips fetched successfully',
                data: dailytips,
            });

        });

    app.get('/:id', {
        schema: {
            tags: ['Dailytips'],
            summary: 'Get daily tip by ID',
            params: idParamsSchema,
            response: { 200: successObjectResponse }
        },
        preHandler: [authMiddleware]
    },
        async (req, reply) => {

            const { id } = req.params as { id: number };
            const dailytips = await dailytipService.getdailyTipsById(id);

            reply.code(200).send({
                success: true,
                message: 'dailytips fetched successfully',
                data: dailytips,
            });

        });

    app.patch('/:id/status', {
        schema: {
            tags: ['Dailytips'],
            summary: 'Toggle daily tip status',
            params: idParamsSchema,
            response: { 200: successObjectResponse }
        },
        preHandler: [authMiddleware, onlyOrg]
    }, async (req, reply) => {

        const { id } = req.params as { id: number };
        const dailytips = await dailytipService.dailyTipsStatus(id);
        return reply.send({ success: true, message: 'Dailytips status updated successfully', data: dailytips });

    });
}
