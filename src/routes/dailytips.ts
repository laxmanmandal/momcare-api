import { FastifyInstance } from 'fastify'
import * as dailytipService from '../services/dailytipService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
import { zodToJsonSchema } from '../utils/zodOpenApi';
import {
    contentToolListQuerySchema,
    dailyTipCreateMultipartSchema,
    dailyTipIdParamsSchema,
    dailyTipUpdateMultipartSchema,
    validateData,
    zodToSwagger
} from '../validations';

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
        data: { type: 'array', items: { type: 'object', additionalProperties: true } },
        pagination: { type: 'object', additionalProperties: true }
    }
} as const

function compactUndefined<T extends Record<string, unknown>>(data: T) {
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
    );
}

export default async function dailytipsRoute(app: FastifyInstance) {
    app.post(
        '/',
        {
            schema: {
                tags: ['Dailytips'],
                summary: 'Create a daily tip',
                consumes: ['multipart/form-data', 'application/json', 'application/x-www-form-urlencoded'],
                body: zodToSwagger(dailyTipCreateMultipartSchema),
                response: { 200: successObjectResponse }
            },
            preHandler: [authMiddleware, onlyOrg]
        },
        async (req: any, reply) => {
            const { fields, files } = validateData(
                dailyTipCreateMultipartSchema,
                await app.parseMultipartMemory(req)
            );

            const dailytipsData = {
                heading: fields.heading,
                subheading: fields.subheading,
                content: fields.content,
                category: fields.category,
                creator: req.user.name
            };

            const dailytips = await dailytipService.createdailyTips(dailytipsData);

            if (files?.icon?.length) {
                const icon = await app.saveFileBuffer(files.icon[0], 'daily-tips');
                await dailytipService.updatedailyTips(Number(dailytips.id), { icon });
                Object.assign(dailytips, { icon });
            }

            reply.code(200).send({
                success: true,
                message: 'dailytips created successfully',
                data: dailytips,
            });
        }
    );

    app.patch(
        '/:id',
        {
            schema: {
                tags: ['Dailytips'],
                summary: 'Update a daily tip',
                consumes: ['multipart/form-data', 'application/json', 'application/x-www-form-urlencoded'],
                body: zodToSwagger(dailyTipUpdateMultipartSchema),
                params: zodToJsonSchema(dailyTipIdParamsSchema as any, { target: 'openApi3' }),
                response: { 200: successObjectResponse }
            },
            preHandler: [authMiddleware, onlyOrg]
        },
        async (req, reply) => {
            const { id } = validateData(dailyTipIdParamsSchema, req.params);
            const { fields, files } = validateData(
                dailyTipUpdateMultipartSchema,
                await app.parseMultipartMemory(req)
            );

            const updateData: any = compactUndefined({
                heading: fields.heading,
                subheading: fields.subheading,
                content: fields.content,
                category: fields.category
            });

            if (files?.icon?.length) {
                updateData.icon = await app.saveFileBuffer(files.icon[0], `daily-tips`);
            }

            const updateddailytips = await dailytipService.updatedailyTips(id, updateData);

            reply.code(200).send({
                success: true,
                message: 'dailytips updated successfully',
                data: updateddailytips,
            });
        }
    );

    app.get(
        '/',
        {
            schema: {
                tags: ['Dailytips'],
                summary: 'List all daily tips',
                querystring: zodToJsonSchema(contentToolListQuerySchema as any, { target: 'openApi3' }),
                response: { 200: successArrayResponse }
            },
            preHandler: [authMiddleware]
        },
        async (req) => {
            const query = validateData(contentToolListQuerySchema, req.query ?? {});
            const result = await dailytipService.getdailyTips(query);
            return {
                success: true,
                message: 'dailytips fetched successfully',
                data: result.data,
                pagination: result.pagination,
            };
        }
    );

    app.get(
        '/:id',
        {
            schema: {
                tags: ['Dailytips'],
                params: zodToJsonSchema(dailyTipIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Get daily tip by ID',
                response: { 200: successObjectResponse }
            },
            preHandler: [authMiddleware]
        },
        async (req) => {
            const { id } = validateData(dailyTipIdParamsSchema, req.params);
            const dailytips = await dailytipService.getdailyTipsById(id);
            return {
                success: true,
                message: 'dailytips fetched successfully',
                data: dailytips,
            };
        }
    );

    app.patch(
        '/:id/status',
        {
            schema: {
                tags: ['Dailytips'],
                consumes: ['application/json', 'application/x-www-form-urlencoded'],
                params: zodToJsonSchema(dailyTipIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Toggle daily tip status',
                response: { 200: successObjectResponse }
            },
            preHandler: [authMiddleware, onlyOrg]
        },
        async (req, reply) => {
            const { id } = validateData(dailyTipIdParamsSchema, req.params);
            const dailytips = await dailytipService.dailyTipsStatus(id);
            return reply.send({ success: true, message: 'Dailytips status updated successfully', data: dailytips });
        }
    );
}
