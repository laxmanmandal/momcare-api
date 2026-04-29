import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import * as healthService from '../services/healthService'
import { authMiddleware } from '../middleware/auth'
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

const successArrayResponse = {
  type: 'object',
  properties: {
    count: { type: 'integer' },
    data: { type: 'array', items: { type: 'object' } }
  }
} as const

const errorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string' }
  }
} as const

export default async function healthRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)


  // Symptoms
  app.post(
    '/symptoms',
    {
      schema: {
        tags: ['Health'],
        description: 'Create a symptom entry',
        body: {
          type: 'object',
          required: ['symptoms'],
          properties: {
            symptoms: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              userId: { type: 'integer' },
              symptoms: { type: 'array', items: { type: 'string' } },
              created_at: { type: 'string' },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          500: { type: 'object', properties: { error: { type: 'string' } } }
        },
      },
    },
    async (req: any, reply: FastifyReply) => {
      try {
        const { symptoms } = req.body;
        if (!Array.isArray(symptoms) || symptoms.length === 0) {
          return reply.status(400).send({ error: ' non-empty symptoms array are required' });
        }

        const entry = await healthService.addSymptomEntry(req.user.id, symptoms);
        return reply.status(201).send('Symptom added successfully');
      } catch (err: any) {
        req.log.error(err);
        console.log(err);

        return reply.status(500).send({ error: 'Failed to create symptom entry' });
      }
    }
  );

  app.get('/symptoms',
    {
      schema: {
        tags: ['Health'],
        summary: 'List the authenticated user symptom entries from the last 30 days',
        response: { 200: successArrayResponse, 500: errorResponse }
      }, preHandler: [authMiddleware]
    },


    async (request: any, reply) => {
      try {
        // Get current date and subtract 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Query records created in the last 30 days
        const records = await prisma.symptomEntry.findMany({
          where: {
            userId: request.user.id,
            created_at: {
              gte: thirtyDaysAgo,
            },
          },
          select: {

            symptoms: true,
            created_at: true,
          },

          orderBy: {
            created_at: 'desc', // optional: newest first
          },
        });

        return reply.send({
          count: records.length,
          data: records,
        });
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    });
}
