import { FastifyInstance } from 'fastify'
import * as dietNuskhaToolervice from '../services/dietNuskhaToolService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
import { zodToJsonSchema } from '../utils/zodOpenApi';
import {
    dietChartMultipartSchema,
    dietNuskheMultipartSchema,
    dietToolIdParamsSchema,
    weekBodySchema,
    validateData
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

const dietChartBodyProps = {
    properties: {
        heading: { type: 'string' },
        weekId: { type: 'integer' },
        category: { type: 'string' },
        subheading: { type: 'string' },
        content: { type: 'string' },
        toolType: { type: 'string' },
        icon: { type: 'string', format: 'binary' }
    }
};

const nuskheBodyProps = {
    properties: {
        category: { type: 'string' },
        heading: { type: 'string' },
        subheading: { type: 'string' },
        content: { type: 'string' },
        icon: { type: 'string', format: 'binary' }
    }
};

export default async function dietNuskhaRoute(app: FastifyInstance) {
    app.addHook('preHandler', authMiddleware)

    app.post('/diet-chart', {
        schema: {
            tags: ['diet-chart'],
            summary: 'Create a diet chart entry',
            consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
            body: dietChartBodyProps,
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [authMiddleware, onlyOrg]
    }, async (req: any, reply) => {
        const { fields, files } = validateData(dietChartMultipartSchema, await app.parseMultipartMemory(req));
        const dietData = {
            creator: req.user.name,
            heading: fields.heading,
            weekId: fields.weekId,
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

    app.patch('/diet-chart/:id', {
        schema: {
            tags: ['diet-chart'],
            summary: 'Update a diet chart entry',
            consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
            body: dietChartBodyProps,
            params: zodToJsonSchema(dietToolIdParamsSchema as any, { target: 'openApi3' }),
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [authMiddleware, onlyOrg]
    }, async (req, reply) => {
        const { id } = validateData(dietToolIdParamsSchema, req.params);
        const { fields, files } = validateData(dietChartMultipartSchema, await app.parseMultipartMemory(req));
        const updateData: any = {
            creator: fields.creator,
            heading: fields.heading,
            weekId: fields.weekId,
            category: fields.category,
            subheading: fields.subheading,
            content: fields.content,
            toolType: fields.toolType
        };
        if (files.icon?.length) {
            updateData.icon = await app.saveFileBuffer(files.icon[0], `diet-chart`);
        }
        const updateddietNuskhaTool = await dietNuskhaToolervice.updateDietchart(Number(id), updateData);
        reply.send({
            success: true,
            message: 'Diet Chart updated successfully',
            data: updateddietNuskhaTool,
        });
    });

    app.get('/diet-chart', {
        schema: {
            tags: ['diet-chart'],
            summary: 'List all diet chart entries',
            response: { 200: successArrayResponse }
        },
        preHandler: [authMiddleware]
    }, async (req, reply) => {
        const dietNuskhaTool = await dietNuskhaToolervice.getDietchart();
        reply.send({
            success: true,
            message: 'Diet Chart fetched successfully',
            data: dietNuskhaTool,
        });
    });

    app.get('/diet-chart-by-week-id/:id', {
        schema: {
            tags: ['diet-chart'],
            params: zodToJsonSchema(dietToolIdParamsSchema as any, { target: 'openApi3' }),
            summary: 'Get diet chart by week ID',
            response: { 200: successArrayResponse }
        },
        preHandler: [authMiddleware]
    }, async (req, reply) => {
        const { id } = validateData(dietToolIdParamsSchema, req.params);
        const dietNuskhaTool = await dietNuskhaToolervice.getDietChartByWeekId(id);
        reply.send({
            success: true,
            message: 'Diet Chart fetched successfully',
            data: dietNuskhaTool,
        });
    });

    app.get('/diet-chart/:id', {
        schema: {
            tags: ['diet-chart'],
            params: zodToJsonSchema(dietToolIdParamsSchema as any, { target: 'openApi3' }),
            summary: 'Get diet chart by ID',
            response: { 200: successObjectResponse, 404: successObjectResponse }
        },
        preHandler: [authMiddleware]
    }, async (req, reply) => {
        const { id } = validateData(dietToolIdParamsSchema, req.params);
        const dietNuskhaTool = await dietNuskhaToolervice.getDietChartById(id);
        reply.code(200).send({
            success: true,
            message: 'Diet Chart fetched successfully',
            data: dietNuskhaTool,
        });
    });

    app.patch('/diet-chart/:id/status', {
        schema: {
            tags: ['diet-chart'],
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            params: zodToJsonSchema(dietToolIdParamsSchema as any, { target: 'openApi3' }),
            summary: 'Toggle diet chart status',
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [authMiddleware, onlyOrg]
    }, async (req, reply) => {
        const { id } = validateData(dietToolIdParamsSchema, req.params);
        const dietNuskhaTool = await dietNuskhaToolervice.DietchartStatus(id);
        return reply.send({ success: true, message: 'Diet Chart status updated successfully', data: dietNuskhaTool });
    });

    app.post('/dadi-nani-nuskhe', {
        schema: {
            tags: ['Dadi-nani-Nuskhe'],
            summary: 'Create a Dadi-Nani Nuskhe entry',
            consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
            body: nuskheBodyProps,
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [authMiddleware, onlyOrg]
    }, async (req: any, reply) => {
        const { fields, files } = validateData(dietNuskheMultipartSchema, await app.parseMultipartMemory(req));
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

    app.patch('/dadi-nani-nuskhe/:id', {
        schema: {
            tags: ['Dadi-nani-Nuskhe'],
            summary: 'Update a Dadi-Nani Nuskhe entry',
            consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
            body: nuskheBodyProps,
            params: zodToJsonSchema(dietToolIdParamsSchema as any, { target: 'openApi3' }),
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [authMiddleware, onlyOrg]
    }, async (req, reply) => {
        const { id } = validateData(dietToolIdParamsSchema, req.params);
        const { fields, files } = validateData(dietNuskheMultipartSchema, await app.parseMultipartMemory(req));
        const updateData: any = {
            creator: fields.creator,
            heading: fields.heading,
            subheading: fields.subheading,
            content: fields.content,
        };
        if (files.icon?.length) {
            updateData.icon = await app.saveFileBuffer(files.icon[0], `dadiNaniNuskhe`);
        }
        const updatedNuskha = await dietNuskhaToolervice.updateNuskhe(Number(id), updateData);
        reply.send({
            success: true,
            message: 'Dani Nani k Nuskhe updated successfully',
            data: updatedNuskha,
        });
    });

    app.get('/dadi-nani-nuskhe', {
        schema: {
            tags: ['Dadi-nani-Nuskhe'],
            summary: 'List all Dadi-Nani Nuskhe',
            response: { 200: successArrayResponse }
        },
        preHandler: [authMiddleware]
    }, async (req, reply) => {
        const NuskhaTool = await dietNuskhaToolervice.getDadiNaniNuskhe();
        reply.send({
            success: true,
            message: 'Dani Nani k Nuskhe fetched successfully',
            data: NuskhaTool,
        });
    });

    app.get('/dadi-nani-nuskhe/:id', {
        schema: {
            tags: ['Dadi-nani-Nuskhe'],
            params: zodToJsonSchema(dietToolIdParamsSchema as any, { target: 'openApi3' }),
            summary: 'Get Dadi-Nani Nuskhe by ID',
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [authMiddleware]
    }, async (req, reply) => {
        const { id } = validateData(dietToolIdParamsSchema, req.params);
        const dietNuskhaTool = await dietNuskhaToolervice.getNuskheById(id);
        reply.send({
            success: true,
            message: 'Dani Nani k Nuskhe fetched successfully',
            data: dietNuskhaTool,
        });
    });

    app.patch('/dadi-nani-nuskhe/:id/status', {
        schema: {
            tags: ['Dadi-nani-Nuskhe'],
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            params: zodToJsonSchema(dietToolIdParamsSchema as any, { target: 'openApi3' }),
            summary: 'Toggle Dadi-Nani Nuskhe status',
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [authMiddleware, onlyOrg]
    }, async (req, reply) => {
        const { id } = validateData(dietToolIdParamsSchema, req.params);
        const dietNuskhaTool = await dietNuskhaToolervice.NuskheStatus(id);
        return reply.send({ success: true, message: 'Dani Nani k Nuskhe status updated successfully', data: dietNuskhaTool });
    });

    app.post('/week', {
        schema: {
            tags: ['diet-chart-weeks'],
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            body: zodToJsonSchema(weekBodySchema as any, { target: 'openApi3' }),
            summary: 'Create a week entry',
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [authMiddleware, onlyOrg]
    }, async (req: any, reply) => {
        const response = await dietNuskhaToolervice.createWeek(validateData(weekBodySchema, req.body ?? {}));
        reply.send({
            success: true,
            message: 'Week created successfully',
            data: response,
        });
    });

    app.get('/week/:id', {
        schema: {
            tags: ['diet-chart-weeks'],
            params: zodToJsonSchema(dietToolIdParamsSchema as any, { target: 'openApi3' }),
            summary: 'Get week by ID',
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [authMiddleware]
    }, async (req, reply) => {
        const { id } = validateData(dietToolIdParamsSchema, req.params);
        const week = await dietNuskhaToolervice.getWeekById(id);
        reply.send({
            success: true,
            message: 'week fetched successfully',
            data: week,
        });
    });

    app.patch('/week/:id', {
        schema: {
            tags: ['diet-chart-weeks'],
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            body: zodToJsonSchema(weekBodySchema.pick({ name: true }) as any, { target: 'openApi3' }),
            params: zodToJsonSchema(dietToolIdParamsSchema as any, { target: 'openApi3' }),
            summary: 'Update a week entry',
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [authMiddleware, onlyOrg]
    }, async (req: any, reply) => {
        const { id } = validateData(dietToolIdParamsSchema, req.params);
        const updateData: any = validateData(weekBodySchema.pick({ name: true }), req.body ?? {});
        const weeks = await dietNuskhaToolervice.updateWeek(id, updateData);
        reply.send({
            success: true,
            message: 'Week updated successfully',
            data: weeks,
        });
    });

    app.get('/weeks', {
        schema: {
            tags: ['diet-chart-weeks'],
            summary: 'List all weeks',
            response: { 200: successArrayResponse }
        },
        preHandler: [authMiddleware]
    }, async (req, reply) => {
        const weeks = await dietNuskhaToolervice.getWeeks();
        reply.send({
            success: true,
            message: 'Week fetched successfully',
            data: weeks,
        });
    });
}
