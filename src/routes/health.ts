import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import * as healthService from '../services/healthService'
import { authMiddleware } from '../middleware/auth'
import prisma from '../prisma/client';
import { zodToJsonSchema } from '../utils/zodOpenApi';
import { healthSymptomsSchema, validateData } from '../validations';

const successArrayResponse = {
  type: 'object',
  properties: {
    count: { type: 'integer' },
    data: { type: 'array', items: { type: 'object', additionalProperties: true } }
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
        consumes: ['application/json', 'application/x-www-form-urlencoded'],
        body: zodToJsonSchema(healthSymptomsSchema as any, { target: 'openApi3' }),
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              userId: { type: 'integer' },
              symptoms: { type: 'string' },
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
        const { symptoms } = validateData(healthSymptomsSchema, req.body ?? {});

        const entry = await healthService.addSymptomEntry(req.user.id, symptoms);
        return reply.status(201).send(entry);
      } catch (err: any) {
        req.log.error(err);
        throw err;
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
            id: true,
            userId: true,
            symptoms: true,
            created_at: true,
            updated_at: true,
          },

          orderBy: {
            created_at: 'desc', // optional: newest first
          },
        });

        const transformedRecords = records.map(r => {
          let symptomsString = '';
          if (r.symptoms) {
            try {
              if (r.symptoms.startsWith('[') || r.symptoms.startsWith('{') || r.symptoms.startsWith('"')) {
                const parsed = JSON.parse(r.symptoms);
                if (Array.isArray(parsed)) {
                  symptomsString = parsed.join(',');
                } else {
                  symptomsString = String(parsed);
                }
              } else {
                symptomsString = r.symptoms;
              }
            } catch (e) {
              symptomsString = r.symptoms;
            }
          }
          return {
            ...r,
            symptoms: symptomsString
          };
        });

        return reply.send({
          count: records.length,
          data: transformedRecords,
        });
      } catch (err) {
        request.log.error(err);
        throw err;
      }
    });
}
