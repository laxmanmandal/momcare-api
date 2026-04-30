import { FastifyInstance } from 'fastify'
import * as expertService from '../services/expertService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
import { zodToJsonSchema } from '../utils/zodOpenApi';
import {
    expertIdParamsSchema,
    validateData
} from '../validations';

const expertBodyProps = {
    properties: {
        name: { type: 'string' },
        profession_id: { type: 'integer', minimum: 1 },
        name_org: { type: 'string' },
        qualification: { type: 'string' },
        image: { type: 'string', format: 'binary' }
    }
};

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

export default async function ExpertRoutes(app: FastifyInstance) {
    app.post(
        '/',
        {
            schema: {
                tags: ['Experts'],
                consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
                body: expertBodyProps,
                summary: 'Create an expert',
                response: { 200: successObjectResponse }
            },
            preHandler: [authMiddleware, onlyOrg]
        },
        async (req, reply) => {
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
        }
    );

    app.patch(
        '/:id',
        {
            schema: {
                tags: ['Experts'],
                consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
                body: expertBodyProps,
                params: zodToJsonSchema(expertIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Update an expert',
                response: { 200: successObjectResponse }
            },
            preHandler: [authMiddleware, onlyOrg]
        },
        async (req, reply) => {
            const { id } = validateData(expertIdParamsSchema, req.params);
            const { files, fields } = await app.parseMultipartMemory(req);
            if (!req.isMultipart() && req.body) Object.assign(fields, req.body);

            const updateData: any = {
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
        }
    );

    app.get(
        '/',
        {
            schema: {
                tags: ['Experts'],
                summary: 'List experts',
                response: { 200: successArrayResponse }
            },
            preHandler: [authMiddleware]
        },
        async () => {
            const Expert = await expertService.getexperts();
            return {
                success: true,
                message: 'Expert fetched successfully',
                data: Expert,
            };
        }
    );

    app.get(
        '/:id',
        {
            schema: {
                tags: ['Experts'],
                params: zodToJsonSchema(expertIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Get expert by ID',
                response: { 200: successObjectResponse }
            },
            preHandler: [authMiddleware]
        },
        async (req) => {
            const { id } = validateData(expertIdParamsSchema, req.params);
            const Expert = await expertService.getexpertsById(id);

            return {
                success: true,
                message: 'Expert fetched successfully',
                data: Expert,
            };
        }
    );
}
