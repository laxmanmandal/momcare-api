import { FastifyInstance } from 'fastify'
import * as dailytipService from '../services/dailytipService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
import {
    dailyTipCreateMultipartSchema,
    dailyTipIdParamsSchema,
    dailyTipUpdateMultipartSchema,
    validateData
} from '../validations';
import { zodToFormDataParams, zodToMultipartRequestBody } from '../utils/zodFormData'

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

export default async function dailytipsRoute(app: FastifyInstance) {
    app.post(
        '/',
        {
            schema: {
                tags: ['Dailytips'],
                summary: 'Create a daily tip',
                consumes: ['multipart/form-data'],
                parameters: zodToFormDataParams(dailyTipCreateMultipartSchema as any),
                requestBody: zodToMultipartRequestBody(dailyTipCreateMultipartSchema as any),
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
        }
    );

    app.patch(
        '/:id',
        {
            schema: {
                tags: ['Dailytips'],
                summary: 'Update a daily tip',
                consumes: ['application/json', 'multipart/form-data'],
                parameters: zodToFormDataParams(dailyTipUpdateMultipartSchema as any),
                requestBody: zodToMultipartRequestBody(dailyTipUpdateMultipartSchema as any),
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

            const updateData: any = {
                title: fields.title,
                heading: fields.heading,
                subheading: fields.subheading,
                content: fields.content,
                category: fields.category
            };

            if (files.icon?.length) {
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
                response: { 200: successArrayResponse }
            },
            preHandler: [authMiddleware]
        },
        async () => {
            const dailytips = await dailytipService.getdailyTips();
            return {
                success: true,
                message: 'dailytips fetched successfully',
                data: dailytips,
            };
        }
    );

    app.get(
        '/:id',
        {
            schema: {
                tags: ['Dailytips'],
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
