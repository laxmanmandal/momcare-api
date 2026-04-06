import { FastifyInstance } from 'fastify'
import * as expertService from '../services/expertService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
export default async function ExpertRoutes(app: FastifyInstance) {
    app.post('/', { schema: { tags: ['Experts'] }, preHandler: [authMiddleware, onlyOrg] }, async (req, reply) => {

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
        '/:id', { schema: { tags: ['Experts'] }, preHandler: [authMiddleware, onlyOrg] },
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
    app.get('/', { schema: { tags: ['Experts'] }, preHandler: [authMiddleware] },
        async (req, reply) => {

            const Expert = await expertService.getexperts();
            reply.code(200).send({
                success: true,
                message: 'Expert fetched successfully',
                data: Expert,
            });

        });
    app.get('/:id', { schema: { tags: ['Experts'] }, preHandler: [authMiddleware] },

        async (req, reply) => {

            const { id } = req.params as { id: string };
            const numericId = Number(id);

            if (isNaN(numericId)) {
                return reply.code(500).send({
                    success: false,
                    message: 'Invalid ID',
                });
            }

            const Expert = await expertService.getexpertsById(numericId);

            reply.code(200).send({
                success: true,
                message: 'Expert fetched successfully',
                data: Expert,
            });

        });

}