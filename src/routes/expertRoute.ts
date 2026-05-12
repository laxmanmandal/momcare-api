import { FastifyInstance } from 'fastify'
import * as expertService from '../services/expertService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
import { zodToJsonSchema } from '../utils/zodOpenApi';
import {
    expertCreateMultipartSchema,
    expertIdParamsSchema,
    expertUpdateMultipartSchema,
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
        data: { type: 'array', items: { type: 'object', additionalProperties: true } }
    }
} as const

export default async function ExpertRoutes(app: FastifyInstance) {
    app.post(
        '/',
        {
            schema: {
                tags: ['Experts'],
                consumes: ['multipart/form-data', 'application/json', 'application/x-www-form-urlencoded'],
                body: zodToSwagger(expertCreateMultipartSchema),
                summary: 'Create an expert',
                response: { 200: successObjectResponse }
            },
            preHandler: [authMiddleware, onlyOrg]
        },
        async (req, reply) => {
            const { fields, files } = validateData(
                expertCreateMultipartSchema,
                await app.parseMultipartMemory(req)
            );
            const expertsData = {
                name: fields.name,
                profession_id: fields.profession_id,
                name_org: fields.name_org,
                qualification: fields.qualification,
                bio: fields.bio,
                certifications: fields.certifications,
                availability: fields.availability,
                languages: fields.languages,
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
                consumes: ['multipart/form-data', 'application/json', 'application/x-www-form-urlencoded'],
                body: zodToSwagger(expertUpdateMultipartSchema),
                params: zodToJsonSchema(expertIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Update an expert',
                response: { 200: successObjectResponse }
            },
            preHandler: [authMiddleware, onlyOrg]
        },
        async (req, reply) => {
            const { id } = validateData(expertIdParamsSchema, req.params);
            const parsed = await app.parseMultipartMemory(req);
            if (!req.isMultipart() && req.body) Object.assign(parsed.fields, req.body);
            const { files, fields } = validateData(expertUpdateMultipartSchema, parsed);

            const updateData: any = {
                name: fields.name,
                profession_id: fields.profession_id,
                name_org: fields.name_org,
                qualification: fields.qualification,
                bio: fields.bio,
                certifications: fields.certifications,
                availability: fields.availability,
                languages: fields.languages,
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
