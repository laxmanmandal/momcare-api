import { FastifyInstance } from 'fastify';
import * as subscriptionService from '../services/subscriptionService';
import { authMiddleware, onlyOrg } from '../middleware/auth';

const planCreateBody = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    price: { type: 'number', minimum: 0 },
    courseIds: {
      oneOf: [
        { type: 'string' },
        {
          type: 'array',
          items: { type: 'integer', minimum: 1 }
        }
      ]
    },
    thumbnail: { type: 'string', contentEncoding: 'binary' }
  }
} as const

export default async function subscriptionRoutes(app: FastifyInstance) {
  // Auth applied to all subscription routes
  app.addHook('preHandler', authMiddleware);

  app.get('/plans', {
    schema: {
      tags: ['Subscription Plans'],

    }
  }, async (_, reply) => {
    try {
      // Fetch plans with courses from service
      const plans = await subscriptionService.getPlans();

      // Map each plan to include coursesCount
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


  app.get('/plans/:uuid',
    {
      schema: {
        tags: ['Subscription Plans'],
      }
    },
    async (req, reply) => {
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
  app.get('/plans/many/:ids', { schema: { tags: ['Subscription Plans'] } }, async (req, reply) => {
    try {
      const { ids } = req.params as { ids: string }; // '2,8,9'
      const idArray = ids.split(',').map(Number);   // [2, 8, 9]

      // Call your existing function
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
  // ========================
  // CREATE PLAN
  // ========================
  app.post('/plans', {
    schema: {
      tags: ['Subscription Plans'],
      consumes: ['multipart/form-data'],
      body: planCreateBody
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    const { files, fields } = await app.parseMultipartMemory(req);


    try {
      let uuid = await app.uid('plan', 'subscriptionPlan');

      let courseIds = fields.courseIds;

      // Convert everything to array of numbers
      if (typeof courseIds === 'string') {
        // If JSON array: "[1,2]"
        if (courseIds.trim().startsWith('[')) {
          courseIds = JSON.parse(courseIds).map(Number);
        }
        else {
          // CSV: "1,2,3"
          courseIds = courseIds.split(',').map(Number);
        }
      }

      const planData = {
        name: fields.name,
        price: fields.price,
        uuid: uuid,
        courseIds: courseIds, // always number[]
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
      // log full error stack
      req.log.error(error);
      console.log(error);

      return reply.code(400).send({
        success: false,
        message: 'Failed to create subscription plan',
        error: (error && error) || 'Unknown error',
      });
    }
  });


  // ========================
  // UPDATE PLAN
  // ========================
  app.patch('/plans/:uuid', {
    schema: {
      tags: ['Subscription Plans'],
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

  // ========================
  // CHANGE PLAN STATUS

  app.patch('/plan/:uuid/status', {
    schema: {
      tags: ['Subscription Plans']

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
  // ========================
  // CHANGE PLAN VISIBILITY

  app.patch('/plan/:uuid/visiblity', {
    schema: {
      tags: ['Subscription Plans'],

    }, preHandler: [onlyOrg]
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
  })
}
