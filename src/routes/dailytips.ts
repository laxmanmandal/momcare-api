import { FastifyInstance } from 'fastify'
import * as dailytipService from '../services/dailytipService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
export default async function dailytipsRoute(app: FastifyInstance) {
    app.post('/',

        {
            schema: { tags: ['Dailytips'] },
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
        '/:id', { schema: { tags: ['Dailytips'] }, preHandler: [authMiddleware, onlyOrg] },
        async (req, reply) => {

            const { id } = req.params as { id: string };

            // Parse form data (multipart or json)
            const { files, fields } = await app.parseMultipartMemory(req);
            if (!req.isMultipart() && req.body) Object.assign(fields, req.body);

            // Prepare update payload
            const updateData: any = {
                title: fields.title,
                heading: fields.heading,
                subheading: fields.subheading,
                content: fields.content,
                category: fields.category,
            };

            // Handle thumbnail upload (if provided)
            if (files.icon?.length) {
                updateData.icon = await app.saveFileBuffer(
                    files.icon[0],
                    `daily-tips`
                );
            }
            // Update database record
            const updateddailytips = await dailytipService.updatedailyTips(Number(id), updateData);

            reply.code(200).send({
                success: true,
                message: 'dailytips updated successfully',
                data: updateddailytips,
            });

        }
    );
    app.get('/', { schema: { tags: ['Dailytips'] }, preHandler: [authMiddleware] },
        async (req, reply) => {

            const dailytips = await dailytipService.getdailyTips();
            reply.code(200).send({
                success: true,
                message: 'dailytips fetched successfully',
                data: dailytips,
            });

        });
    app.get('/:id', { schema: { tags: ['Dailytips'] }, preHandler: [authMiddleware] },

        async (req, reply) => {

            const { id } = req.params as { id: string };
            const numericId = Number(id);

            if (isNaN(numericId)) {
                return reply.code(500).send({
                    success: false,
                    message: 'Invalid ID',
                });
            }

            const dailytips = await dailytipService.getdailyTipsById(numericId);

            reply.code(200).send({
                success: true,
                message: 'dailytips fetched successfully',
                data: dailytips,
            });

        });
    app.patch('/:id/status', { schema: { tags: ['Dailytips'] }, preHandler: [authMiddleware, onlyOrg] }, async (req, reply) => {

        const { id } = req.params as { id: number };
        const dailytips = await dailytipService.dailyTipsStatus(id);
        return reply.send({ success: true, message: 'Dailytips status updated successfully', data: dailytips });

    });
}