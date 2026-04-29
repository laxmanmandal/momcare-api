import { FastifyInstance } from 'fastify';
import * as subscriptionService from '../services/subscriptionService';
import { authMiddleware, onlyOrg } from '../middleware/auth';

const uuidParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['uuid'],
  properties: {
    uuid: { type: 'string', minLength: 2, maxLength: 64 }
  }
} as const

const idsParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ids'],
  properties: {
    ids: { type: 'string', minLength: 1 }
  }
} as const

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
      params: uuidParamsSchema,
      response: { 200: successObjectResponse, 404: successObjectResponse }
    }
  }, async (req, reply) => {
    try {
      const { uuid } = req.params as { uuid: string };
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
      params: idsParamsSchema,
      response: { 200: successArrayResponse, 500: successObjectResponse }
    }
  }, async (req, reply) => {
    try {
      const { ids } = req.params as { ids: string };
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
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1 },
          price: { type: 'number', minimum: 0 },
          courseIds: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'integer', minimum: 1 } }
            ]
          },
          thumbnail: { type: 'string', contentEncoding: 'binary' }
        }
      },
      response: { 201: successObjectResponse, 400: successObjectResponse }
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    const { files, fields } = await app.parseMultipartMemory(req);
    try {
      let uuid = await app.uid('plan', 'subscriptionPlan');
      let courseIds = fields.courseIds;
      if (typeof courseIds === 'string') {
        if (courseIds.trim().startsWith('[')) {
          courseIds = JSON.parse(courseIds).map(Number);
        } else {
          courseIds = courseIds.split(',').map(Number);
        }
      }
      const planData = {
        name: fields.name,
        price: fields.price,
        uuid: uuid,
        courseIds: courseIds,
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
      params: uuidParamsSchema,
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1 },
          price: { type: 'number', minimum: 0 },
          courseIds: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'integer', minimum: 1 } }
            ]
          }
        }
      },
      response: { 200: successObjectResponse, 400: successObjectResponse }
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    try {
      const { uuid } = req.params as { uuid: string };
      const updated = await subscriptionService.updatePlan(uuid, req.body as any);
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
      params: uuidParamsSchema,
      response: { 200: successObjectResponse, 400: successObjectResponse }
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    try {
      const { uuid } = req.params as { uuid: string };
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
      params: uuidParamsSchema,
      response: { 200: successObjectResponse, 400: successObjectResponse }
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    try {
      const { uuid } = req.params as { uuid: string };
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
