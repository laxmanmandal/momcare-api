import { FastifyInstance } from 'fastify'
import * as dietNuskhaToolervice from '../services/dietNuskhaToolService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
export default async function dietNuskhaRoute(app: FastifyInstance) {
    app.addHook('preHandler', authMiddleware)


    app.post('/diet-chart',
        {
            schema: { tags: ['diet-chart'] },
            preHandler: [authMiddleware, onlyOrg]
        },


        async (req: any, reply) => {

            const { files, fields } = await app.parseMultipartMemory(req);

            const dietData = {
                creator: req.user.name,
                heading: fields.heading,
                weekId: Number(fields.weekId),
                category: fields.category,
                subheading: fields.subheading,
                content: fields.content,
                toolType: fields.toolType
            };

            const response = await dietNuskhaToolervice.createDietchart(dietData);

            if (files.icon?.length) {
                const icon = await app.saveFileBuffer(files.icon[0], 'diet-chart');
                await dietNuskhaToolervice.updateDietchart(Number(response.id), { icon });
                Object.assign(response, { icon });
            }

            reply.send({
                success: true,
                message: 'Diet Chart created successfully',
                data: response,
            });

        });

    app.patch(
        '/diet-chart/:id',
        { schema: { tags: ['diet-chart'] }, preHandler: [authMiddleware, onlyOrg] },
        async (req, reply) => {

            const { id } = req.params as { id: string };

            // Parse form data (multipart or json)
            const { files, fields } = await app.parseMultipartMemory(req);
            if (!req.isMultipart() && req.body) Object.assign(fields, req.body);

            // Prepare update payload
            const updateData: any = {
                creator: fields.creator,
                heading: fields.heading,
                weekId: Number(fields.weekId),
                category: fields.category,
                subheading: fields.subheading,
                content: fields.content,
                toolType: fields.toolType
            };

            // Handle thumbnail upload (if provided)
            if (files.icon?.length) {
                updateData.icon = await app.saveFileBuffer(
                    files.icon[0],
                    `diet-chart`
                );
            }
            // Update database record
            const updateddietNuskhaTool = await dietNuskhaToolervice.updateDietchart(Number(id), updateData);

            reply.send({
                success: true,
                message: 'Diet Chart updated successfully',
                data: updateddietNuskhaTool,
            });
        }

    );
    app.get('/diet-chart',
        { schema: { tags: ['diet-chart'] }, preHandler: [authMiddleware] },
        async (req, reply) => {

            const dietNuskhaTool = await dietNuskhaToolervice.getDietchart();
            reply.send({
                success: true,
                message: 'Diet Chart fetched successfully',
                data: dietNuskhaTool,
            });

        });
    app.get('/diet-chart-by-week-id/:id',
        { schema: { tags: ['diet-chart'] }, preHandler: [authMiddleware] },
        async (req, reply) => {

            const { id } = req.params as { id: string };
            const numericId = Number(id);
            const dietNuskhaTool = await dietNuskhaToolervice.getDietChartByWeekId(numericId);
            reply.send({
                success: true,
                message: 'Diet Chart fetched successfully',
                data: dietNuskhaTool,
            });

        });
    app.get('/diet-chart/:id',
        { schema: { tags: ['diet-chart'] }, preHandler: [authMiddleware] },
        async (req, reply) => {

            const { id } = req.params as { id: string };
            const numericId = Number(id);

            if (isNaN(numericId)) {
                return reply.code(404).send({
                    success: false,
                    message: 'Invalid ID',
                });
            }

            const dietNuskhaTool = await dietNuskhaToolervice.getDietChartById(numericId);

            reply.code(200).send({
                success: true,
                message: 'Diet Chart fetched successfully',
                data: dietNuskhaTool,
            });

        });
    app.patch('/diet-chart/:id/status', { schema: { tags: ['diet-chart'] }, preHandler: [authMiddleware, onlyOrg] }, async (req, reply) => {

        const { id } = req.params as { id: number };
        const dietNuskhaTool = await dietNuskhaToolervice.DietchartStatus(id);
        return reply.send({ success: true, message: 'Diet Chart status updated successfully', data: dietNuskhaTool });

    });

    // dadiNani k nuskhe 

    app.post('/dadi-nani-nuskhe',
        { schema: { tags: ['Dadi-nani-Nuskhe'] }, preHandler: [authMiddleware, onlyOrg] },

        async (req: any, reply) => {

            const { files, fields } = await app.parseMultipartMemory(req);

            const dadinaniData = {
                creator: req.user.name,
                category: fields.category,
                heading: fields.heading,
                subheading: fields.subheading,
                content: fields.content,
            };

            const response = await dietNuskhaToolervice.createNuskhe(dadinaniData);

            if (files.icon?.length) {
                const icon = await app.saveFileBuffer(files.icon[0], 'dadiNaniNuskhe');
                await dietNuskhaToolervice.updateNuskhe(Number(response.id), { icon });
                Object.assign(response, { icon });
            }

            reply.send({
                success: true,
                message: 'Dani Nani k Nuskhe created successfully',
                data: response,
            });

        });

    app.patch(
        '/dadi-nani-nuskhe/:id',
        { schema: { tags: ['Dadi-nani-Nuskhe'] }, preHandler: [authMiddleware, onlyOrg] },
        async (req, reply) => {

            const { id } = req.params as { id: string };

            // Parse form data (multipart or json)
            const { files, fields } = await app.parseMultipartMemory(req);
            if (!req.isMultipart() && req.body) Object.assign(fields, req.body);

            // Prepare update payload
            const updateData: any = {
                creator: fields.creator,
                heading: fields.heading,
                subheading: fields.subheading,
                content: fields.content,
            };

            // Handle thumbnail upload (if provided)
            if (files.icon?.length) {
                updateData.icon = await app.saveFileBuffer(
                    files.icon[0],
                    `dadiNaniNuskhe`
                );
            }
            // Update database record
            const updatedNuskha = await dietNuskhaToolervice.updateNuskhe(Number(id), updateData);

            reply.send({
                success: true,
                message: 'Dani Nani k Nuskhe updated successfully',
                data: updatedNuskha,
            });

        }
    );
    app.get('/dadi-nani-nuskhe',
        { schema: { tags: ['Dadi-nani-Nuskhe'] }, preHandler: [authMiddleware] },
        async (req, reply) => {

            const NuskhaTool = await dietNuskhaToolervice.getDadiNaniNuskhe();
            reply.send({
                success: true,
                message: 'Dani Nani k Nuskhe fetched successfully',
                data: NuskhaTool,
            });

        });
    app.get('/dadi-nani-nuskhe/:id',
        { schema: { tags: ['Dadi-nani-Nuskhe'] }, preHandler: [authMiddleware] },
        async (req, reply) => {

            const { id } = req.params as { id: string };
            const numericId = Number(id);

            if (isNaN(numericId)) {
                return reply.code(500).send({
                    success: false,
                    message: 'Invalid ID',
                });
            }

            const dietNuskhaTool = await dietNuskhaToolervice.getNuskheById(numericId);

            reply.send({
                success: true,
                message: 'Dani Nani k Nuskhe fetched successfully',
                data: dietNuskhaTool,
            });

        });
    app.patch('/dadi-nani-nuskhe/:id/status', { schema: { tags: ['Dadi-nani-Nuskhe'] }, preHandler: [authMiddleware, onlyOrg] }, async (req, reply) => {

        const { id } = req.params as { id: number };
        const dietNuskhaTool = await dietNuskhaToolervice.NuskheStatus(id);
        return reply.send({ success: true, message: 'Dani Nani k Nuskhe status updated successfully', data: dietNuskhaTool });

    });



    app.post('/week',
        {
            schema: {
                tags: ['diet-chart-weeks'],
                body: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        order: { type: 'number' }
                    },
                    required: ['name', 'order'],
                },
            }, preHandler: [authMiddleware, onlyOrg]
        },

        async (req: any, reply) => {

            const response = await dietNuskhaToolervice.createWeek(req.body as any);


            reply.send({
                success: true,
                message: 'Week created successfully',
                data: response,
            });

        });
    app.get('/week/:id',
        { schema: { tags: ['diet-chart-weeks'] }, preHandler: [authMiddleware] },
        async (req, reply) => {

            const { id } = req.params as { id: string };
            const numericId = Number(id);

            if (isNaN(numericId)) {
                return reply.code(500).send({
                    success: false,
                    message: 'Invalid ID',
                });
            }

            const week = await dietNuskhaToolervice.getWeekById(numericId);

            reply.send({
                success: true,
                message: 'week fetched successfully',
                data: week,
            });

        });
    app.patch(
        '/week/:id',
        { schema: { tags: ['diet-chart-weeks'] }, preHandler: [authMiddleware, onlyOrg] },
        async (req: any, reply) => {

            const { id } = req.params as { id: string };
            const updateData: any = {
                name: req.body.name,

            };
            // Update database record
            const weeks = await dietNuskhaToolervice.updateWeek(Number(id), updateData);

            reply.send({
                success: true,
                message: 'Week updated successfully',
                data: weeks,
            });

        }
    );
    app.get('/weeks',
        { schema: { tags: ['diet-chart'] }, preHandler: [authMiddleware] },
        async (req, reply) => {

            const weeks = await dietNuskhaToolervice.getWeeks();
            reply.send({
                success: true,
                message: 'Week fetched successfully',
                data: weeks,
            });

        });
}