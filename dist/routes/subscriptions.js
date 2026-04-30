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
exports.default = subscriptionRoutes;
const subscriptionService = __importStar(require("../services/subscriptionService"));
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
async function subscriptionRoutes(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    app.get('/plans', {
        schema: {
            tags: ['Subscription Plans'],
            summary: 'List all subscription plans',
            description: 'Returns all subscription plans with course counts.',
            response: { 200: successArrayResponse, 500: successObjectResponse }
        }
    }, async (_, reply) => {
        try {
            const plans = await subscriptionService.getPlans();
            const plansWithCount = plans.map(plan => ({
                ...plan,
                coursesCount: Array.isArray(plan.courses) ? plan.courses.length : 0
            }));
            return reply.code(200).send({
                success: true,
                message: 'Subscription plans fetched successfully',
                data: plansWithCount
            });
        }
        catch (error) {
            console.error('Error fetching plans:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to fetch subscription plans',
                error: error.message
            });
        }
    });
    app.get('/plans/:uuid', {
        schema: {
            tags: ['Subscription Plans'],
            summary: 'Get subscription plan by UUID',
            response: { 200: successObjectResponse, 404: successObjectResponse }
        }
    }, async (req, reply) => {
        try {
            const { uuid } = (0, validations_1.validateData)(validations_1.subscriptionUuidParamsSchema, req.params);
            const plan = await subscriptionService.getPlan(uuid);
            return reply.code(200).send({
                success: true,
                message: 'Subscription plan fetched successfully',
                data: plan
            });
        }
        catch (error) {
            return reply.code(404).send({
                success: false,
                message: error.message
            });
        }
    });
    app.get('/plans/many/:ids', {
        schema: {
            tags: ['Subscription Plans'],
            summary: 'Get many plans by IDs',
            response: { 200: successArrayResponse, 500: successObjectResponse }
        }
    }, async (req, reply) => {
        try {
            const { ids } = (0, validations_1.validateData)(validations_1.subscriptionIdsParamsSchema, req.params);
            const idArray = ids.split(',').map(Number);
            const courses = await subscriptionService.getPlansByManyIds(idArray);
            return reply.code(200).send({
                success: true,
                message: 'Plans fetched successfully',
                data: courses,
            });
        }
        catch (error) {
            console.error('Error fetching many plans:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to fetch Plans',
                error: error.message,
            });
        }
    });
    app.post('/plans', {
        schema: {
            tags: ['Subscription Plans'],
            summary: 'Create a subscription plan',
            description: 'Creates a new subscription plan. Supports multipart for thumbnail upload.',
            consumes: ['multipart/form-data'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.subscriptionPlanCreateSchema),
            response: { 201: successObjectResponse, 400: successObjectResponse }
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { fields, files } = (0, validations_1.validateData)(validations_1.subscriptionPlanCreateSchema, await app.parseMultipartMemory(req));
        try {
            let uuid = await app.uid('plan', 'subscriptionPlan');
            const planData = {
                name: fields.name,
                price: fields.price,
                uuid: uuid,
                courseIds: fields.courseIds
            };
            const result = await subscriptionService.createPlan(planData);
            if (files.thumbnail?.length && result) {
                const thumbnail = await app.saveFileBuffer(files.thumbnail[0], 'subscription-plans');
                await subscriptionService.updatePlan(result.uuid, { thumbnail });
                result.thumbnail = thumbnail;
            }
            return reply.code(201).send({
                success: true,
                message: 'Subscription plan created successfully',
                data: result
            });
        }
        catch (error) {
            req.log.error(error);
            return reply.code(400).send({
                success: false,
                message: 'Failed to create subscription plan',
                error: (error && error) || 'Unknown error',
            });
        }
    });
    app.patch('/plans/:uuid', {
        schema: {
            tags: ['Subscription Plans'],
            summary: 'Update a subscription plan',
            response: { 200: successObjectResponse, 400: successObjectResponse },
            body: (0, zod_to_json_schema_1.zodToJsonSchema)(validations_1.subscriptionPlanUpdateSchema, 'subscriptionPlanUpdateBody')
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        try {
            const { uuid } = (0, validations_1.validateData)(validations_1.subscriptionUuidParamsSchema, req.params);
            const updated = await subscriptionService.updatePlan(uuid, (0, validations_1.validateData)(validations_1.subscriptionPlanUpdateSchema, req.body ?? {}));
            return reply.code(200).send({
                success: true,
                message: 'Subscription plan updated successfully',
                data: updated
            });
        }
        catch (error) {
            return reply.code(400).send({
                success: false,
                message: 'Failed to update subscription plan',
                error: error.message
            });
        }
    });
    app.patch('/plan/:uuid/status', {
        schema: {
            tags: ['Subscription Plans'],
            summary: 'Toggle plan active status',
            response: { 200: successObjectResponse, 400: successObjectResponse }
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        try {
            const { uuid } = (0, validations_1.validateData)(validations_1.subscriptionUuidParamsSchema, req.params);
            const status = await subscriptionService.SubscriptionStatus(uuid);
            const msg = status.isActive
                ? 'Subscription plan activated successfully'
                : 'Subscription plan disabled successfully';
            return reply.code(200).send({ success: true, message: msg, data: status });
        }
        catch (error) {
            return reply.code(400).send({
                success: false,
                message: 'Failed to change subscription plan status',
                error: error.message
            });
        }
    });
    app.patch('/plan/:uuid/visiblity', {
        schema: {
            tags: ['Subscription Plans'],
            summary: 'Toggle plan visibility',
            response: { 200: successObjectResponse, 400: successObjectResponse }
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        try {
            const { uuid } = (0, validations_1.validateData)(validations_1.subscriptionUuidParamsSchema, req.params);
            const status = await subscriptionService.SubscriptionVisible(uuid);
            const msg = status.isActive
                ? 'Subscription plan Visible successfully'
                : 'Subscription plan Invisible successfully';
            return reply.code(200).send({ success: true, message: msg, data: status });
        }
        catch (error) {
            return reply.code(400).send({
                success: false,
                message: 'Failed to change subscription visiblity status',
                error: error.message
            });
        }
    });
}
//# sourceMappingURL=subscriptions.js.map