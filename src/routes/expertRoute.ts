import { FastifyInstance } from 'fastify'
import * as expertService from '../services/expertService'
import { authMiddleware, onlyOrg } from '../middleware/auth';

const expertBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        name: { type: 'string' },
        profession_id: { type: 'integer', minimum: 1 },
        name_org: { type: 'string' },
        qualification: { type: 'string' },
        image: { type: 'string', contentEncoding: 'binary' }
    }
} as const

const expertIdParamsSchema = {
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

export default async function ExpertRoutes(app: FastifyInstance) {
    app.post('/', {
        schema: {
            tags: ['Experts'],
            consumes: ['multipart/form-data'],
            summary: 'Create an expert',
            body: expertBody,
            response: { 200: successObjectResponse }
        }, preHandler: [authMiddleware, onlyOrg]
    }, async (req, reply) => {

        const { files, fields } = await app.parseMultipartMemory(req);

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

    app.patch(
        '/:id', {
        schema: {
            tags: ['Experts'],
            consumes: ['application/json', 'multipart/form-data'],
            summary: 'Update an expert',
            params: expertIdParamsSchema,
            body: expertBody,
            response: { 200: successObjectResponse }
        }, preHandler: [authMiddleware, onlyOrg] },
        async (req, reply) => {

            const { id } = req.params as { id: string };

            // Parse form data (multipart or json)
            const { files, fields } = await app.parseMultipartMemory(req);
            if (!req.isMultipart() && req.body) Object.assign(fields, req.body);

            // Prepare update payload
            const updateData: any = {
                name: fields.name,
                profession_id: Number(fields.profession_id),
                name_org: fields.name_org,
                qualification: fields.qualification,
            };

            // Handle thumbnail upload (if provided)
            if (files.image?.length) {
                updateData.image = await app.saveFileBuffer(
                    files.image[0],
                    `_experts`
                );
            }
            // Update database record
            const updatedExpert = await expertService.updateexperts(Number(id), updateData);

            reply.code(200).send({
                success: true,
                message: 'Expert updated successfully',
                data: updatedExpert,
            });

        }
    );
    app.get('/', {
        schema: {
            tags: ['Experts'],
            summary: 'List experts',
            response: { 200: successArrayResponse }
        }, preHandler: [authMiddleware]
    },
        async (req, reply) => {

            const Expert = await expertService.getexperts();
            reply.code(200).send({
                success: true,
                message: 'Expert fetched successfully',
                data: Expert,
            });

        });
    app.get('/:id', {
        schema: {
            tags: ['Experts'],
            summary: 'Get expert by ID',
            params: expertIdParamsSchema,
            response: { 200: successObjectResponse }
        }, preHandler: [authMiddleware]
    },

        async (req, reply) => {

            const { id } = req.params as { id: number };

            const Expert = await expertService.getexpertsById(id);

            reply.code(200).send({
                success: true,
                message: 'Expert fetched successfully',
                data: Expert,
            });

        });

}
