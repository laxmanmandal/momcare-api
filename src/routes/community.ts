import { FastifyInstance } from 'fastify'
import * as communityService from '../services/communityService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
import createHttpError from 'http-errors';
import {
  assertAllowedFileFields,
  assertAllowedKeys,
  pickDefined,
  readIdParam,
  readString
} from '../utils/requestValidation';

const communityCreateBody = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 120 },
    description: { type: 'string', maxLength: 1000 },
    imageUrl: { type: 'string', contentEncoding: 'binary' }
  }
} as const

const communityUpdateBody = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 120 },
    description: { type: 'string', maxLength: 1000 },
    imageUrl: { type: 'string', contentEncoding: 'binary' }
  }
} as const

const idParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: {
    id: { type: 'integer', minimum: 1 }
  }
} as const

const communityResponse = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    imageUrl: { type: 'string', nullable: true },
    isActive: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  }
} as const

export default async function community(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/', {
    schema: {
      tags: ['Community'],
      consumes: ['multipart/form-data'],
      body: communityCreateBody,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: communityResponse
          }
        }
      }
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {

    const { files, fields } = await app.parseMultipartMemory(req);
    assertAllowedKeys(fields, ['name', 'description'])
    assertAllowedFileFields(files, ['imageUrl'])

    const community = {
      name: readString(fields, 'name', { required: true, minLength: 2, maxLength: 120 })!,
      description: readString(fields, 'description', { maxLength: 1000 }),
    };

    const communityData = await communityService.createCommunity(community);

    if (files.imageUrl?.length) {
      const imageUrl = await app.saveFileBuffer(files.imageUrl[0], '_community');
      await communityService.updateCommunity(Number(communityData.id), { imageUrl });
      Object.assign(communityData, { imageUrl });
    }

    reply.code(201).send({
      success: true,
      message: 'Community created successfully',
      data: communityData,
    });

  });

  app.patch(
    '/:id', {
    schema: {
      tags: ['Community'],
      consumes: ['application/json', 'multipart/form-data'],
      params: idParamsSchema,
      body: communityUpdateBody,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: communityResponse
          }
        }
      }
    },
    preHandler: [onlyOrg]
  },
    async (req, reply) => {

      const { id } = req.params as { id: number };

      // Parse form data (multipart or json)
      const { files, fields } = await app.parseMultipartMemory(req);
      assertAllowedKeys(fields, ['name', 'description'])
      assertAllowedFileFields(files, ['imageUrl'])

      // Prepare update payload
      const community = pickDefined({
        name: readString(fields, 'name', { minLength: 2, maxLength: 120 }),
        description: readString(fields, 'description', { maxLength: 1000 }),
      }) as { name?: string; description?: string; imageUrl?: string };

      if (Object.keys(community).length === 0 && !files.imageUrl?.length) {
        throw createHttpError(400, 'At least one field is required')
      }

      // Handle thumbnail upload (if provided)
      if (files.imageUrl?.length) {
        community.imageUrl = await app.saveFileBuffer(
          files.imageUrl[0],
          `_community`
        );
      }
      // Update database record
      const communityData = await communityService.updateCommunity(id, community);

      reply.code(200).send({
        success: true,
        message: 'community updated successfully',
        data: communityData,
      });

    }
  );
  app.get('/', {
    schema: {
      tags: ['Community'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'array', items: communityResponse }
          }
        }
      }
    }
  },
    async (req, reply) => {

      const communities = await communityService.getCommunity();
      reply.code(200).send({
        success: true,
        message: 'community fetched successfully',
        data: communities,
      });

    });
  app.get('/:id', {
    schema: {
      tags: ['Community'],
      params: idParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: communityResponse
          }
        }
      }
    }
  },

    async (req, reply) => {

      const { id } = req.params as { id: number };

      const community = await communityService.getCommunityById(id);

      reply.code(200).send({
        success: true,
        message: 'community fetched successfully',
        data: community,
      });

    });
  app.patch('/:id/status',
    {
      schema: {
        tags: ['Community'],
        params: idParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: communityResponse
            }
          }
        }
      },
      preHandler: [onlyOrg]
    }, async (req, reply) => {

      const { id } = req.params as { id: number };
      const community = await communityService.CommunityStatus(id);
      return reply.send({ success: true, message: 'Community status updated successfully', data: community });

    });

  app.post('/join', {
    schema: {
      tags: ['Community'],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['communityId'],
        properties: {
          userId: { type: 'integer', minimum: 1 },
          communityId: { type: 'integer', minimum: 1 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            subscribed: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (req, reply) => {

    const { userId, communityId } = (req.body as { userId?: string | number; communityId?: string | number }) ?? {};
    const authenticatedUserId = readIdParam(req.user?.id, 'userId');

    if (userId !== undefined && Number(userId) !== authenticatedUserId) {
      throw createHttpError(403, 'You cannot join a community for another user')
    }

    const result = await communityService.handleCommunityJoin({
      userId: authenticatedUserId,
      communityId: Number(communityId)
    });

    return reply.code(200).send({
      success: true,
      message: result.message,
      subscribed: result.subscribed,
      data: result.data
    });


  });

}

