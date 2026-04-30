"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = dietNuskhaRoute;
const dietNuskhaToolervice = __importStar(require("../services/dietNuskhaToolService"));
const auth_1 = require("../middleware/auth");
const validations_1 = require("../validations");
const zod_to_json_schema_1 = require("zod-to-json-schema");
const zodFormData_1 = require("../utils/zodFormData");
const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true }
    }
};
const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object', additionalProperties: true } }
    }
};
const dietChartBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        heading: { type: 'string' },
        weekId: { type: 'integer', minimum: 1 },
        category: { type: 'string' },
        subheading: { type: 'string' },
        content: { type: 'string' },
        toolType: { type: 'string' },
        icon: { type: 'string', contentEncoding: 'binary' }
    }
};
const nuskheBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        category: { type: 'string' },
        heading: { type: 'string' },
        subheading: { type: 'string' },
        content: { type: 'string' },
        icon: { type: 'string', contentEncoding: 'binary' }
    }
};
const weekBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        name: { type: 'string' },
        order: { type: 'number' }
    },
    required: ['name', 'order']
};
async function dietNuskhaRoute(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    app.post('/diet-chart', {
        schema: {
            tags: ['diet-chart'],
            summary: 'Create a diet chart entry',
            consumes: ['multipart/form-data'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.dietChartMultipartSchema),
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { fields, files } = (0, validations_1.validateData)(validations_1.dietChartMultipartSchema, await app.parseMultipartMemory(req));
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
            consumes: ['application/json', 'multipart/form-data'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.dietChartMultipartSchema),
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.dietToolIdParamsSchema, req.params);
        const { fields, files } = (0, validations_1.validateData)(validations_1.dietChartMultipartSchema, await app.parseMultipartMemory(req));
        const updateData = {
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
        preHandler: [auth_1.authMiddleware]
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
            summary: 'Get diet chart by week ID',
            response: { 200: successArrayResponse }
        },
        preHandler: [auth_1.authMiddleware]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.dietToolIdParamsSchema, req.params);
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
            summary: 'Get diet chart by ID',
            response: { 200: successObjectResponse, 404: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.dietToolIdParamsSchema, req.params);
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
            summary: 'Toggle diet chart status',
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.dietToolIdParamsSchema, req.params);
        const dietNuskhaTool = await dietNuskhaToolervice.DietchartStatus(id);
        return reply.send({ success: true, message: 'Diet Chart status updated successfully', data: dietNuskhaTool });
    });
    app.post('/dadi-nani-nuskhe', {
        schema: {
            tags: ['Dadi-nani-Nuskhe'],
            summary: 'Create a Dadi-Nani Nuskhe entry',
            consumes: ['multipart/form-data'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.dietNuskheMultipartSchema),
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { fields, files } = (0, validations_1.validateData)(validations_1.dietNuskheMultipartSchema, await app.parseMultipartMemory(req));
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
            consumes: ['application/json', 'multipart/form-data'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.dietNuskheMultipartSchema),
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.dietToolIdParamsSchema, req.params);
        const { fields, files } = (0, validations_1.validateData)(validations_1.dietNuskheMultipartSchema, await app.parseMultipartMemory(req));
        const updateData = {
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
        preHandler: [auth_1.authMiddleware]
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
            summary: 'Get Dadi-Nani Nuskhe by ID',
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.dietToolIdParamsSchema, req.params);
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
            summary: 'Toggle Dadi-Nani Nuskhe status',
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.dietToolIdParamsSchema, req.params);
        const dietNuskhaTool = await dietNuskhaToolervice.NuskheStatus(id);
        return reply.send({ success: true, message: 'Dani Nani k Nuskhe status updated successfully', data: dietNuskhaTool });
    });
    app.post('/week', {
        schema: {
            tags: ['diet-chart-weeks'],
            summary: 'Create a week entry',
            body: (0, zod_to_json_schema_1.zodToJsonSchema)(validations_1.weekBodySchema, 'weekBody'),
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const response = await dietNuskhaToolervice.createWeek((0, validations_1.validateData)(validations_1.weekBodySchema, req.body ?? {}));
        reply.send({
            success: true,
            message: 'Week created successfully',
            data: response,
        });
    });
    app.get('/week/:id', {
        schema: {
            tags: ['diet-chart-weeks'],
            summary: 'Get week by ID',
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.dietToolIdParamsSchema, req.params);
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
            summary: 'Update a week entry',
            body: (0, zod_to_json_schema_1.zodToJsonSchema)(validations_1.weekBodySchema.pick({ name: true }), 'weekUpdateBody'),
            response: { 200: successObjectResponse, 500: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.dietToolIdParamsSchema, req.params);
        const updateData = (0, validations_1.validateData)(validations_1.weekBodySchema.pick({ name: true }), req.body ?? {});
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
        preHandler: [auth_1.authMiddleware]
    }, async (req, reply) => {
        const weeks = await dietNuskhaToolervice.getWeeks();
        reply.send({
            success: true,
            message: 'Week fetched successfully',
            data: weeks,
        });
    });
}
//# sourceMappingURL=dietNuskhaTool.js.map