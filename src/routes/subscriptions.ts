import { FastifyInstance } from 'fastify';
import * as subscriptionService from '../services/subscriptionService';
import { authMiddleware, onlyOrg } from '../middleware/auth';
import {
  subscriptionIdsParamsSchema,
  subscriptionPlanCreateSchema,
  subscriptionPlanUpdateSchema,
  subscriptionUuidParamsSchema,
  validateData
} from '../validations';
import { zodToJsonSchema } from 'zod-to-json-schema'
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

export default async function subscriptionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

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
    } catch (error: any) {
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
      const { uuid } = validateData(subscriptionUuidParamsSchema, req.params);
      const plan = await subscriptionService.getPlan(uuid);
      return reply.code(200).send({
        success: true,
        message: 'Subscription plan fetched successfully',
        data: plan
      });
    } catch (error: any) {
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
      const { ids } = validateData(subscriptionIdsParamsSchema, req.params);
      const idArray = ids.split(',').map(Number);
      const courses = await subscriptionService.getPlansByManyIds(idArray);
      return reply.code(200).send({
        success: true,
        message: 'Plans fetched successfully',
        data: courses,
      });
    } catch (error: any) {
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
        parameters: zodToFormDataParams(subscriptionPlanCreateSchema as any),
        requestBody: zodToMultipartRequestBody(subscriptionPlanCreateSchema as any),
        response: { 201: successObjectResponse, 400: successObjectResponse }
      },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    const { fields, files } = validateData(
      subscriptionPlanCreateSchema,
      await app.parseMultipartMemory(req)
    );
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
    } catch (error: any) {
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
      body: zodToJsonSchema(subscriptionPlanUpdateSchema as any, 'subscriptionPlanUpdateBody')
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    try {
      const { uuid } = validateData(subscriptionUuidParamsSchema, req.params);
      const updated = await subscriptionService.updatePlan(uuid, validateData(subscriptionPlanUpdateSchema, req.body ?? {}));
      return reply.code(200).send({
        success: true,
        message: 'Subscription plan updated successfully',
        data: updated
      });
    } catch (error: any) {
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
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    try {
      const { uuid } = validateData(subscriptionUuidParamsSchema, req.params);
      const status = await subscriptionService.SubscriptionStatus(uuid);
      const msg = status.isActive
        ? 'Subscription plan activated successfully'
        : 'Subscription plan disabled successfully';
      return reply.code(200).send({ success: true, message: msg, data: status });
    } catch (error: any) {
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
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    try {
      const { uuid } = validateData(subscriptionUuidParamsSchema, req.params);
      const status = await subscriptionService.SubscriptionVisible(uuid);
      const msg = status.isActive
        ? 'Subscription plan Visible successfully'
        : 'Subscription plan Invisible successfully';
      return reply.code(200).send({ success: true, message: msg, data: status });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: 'Failed to change subscription visiblity status',
        error: error.message
      });
    }
  });
}
