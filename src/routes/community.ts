import { FastifyInstance } from 'fastify'
import * as communityService from '../services/communityService'
import { authMiddleware, onlyOrg } from '../middleware/auth';

const communityCreateBody = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    imageUrl: { type: 'string', contentEncoding: 'binary' }
  }
} as const

const communityUpdateBody = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    imageUrl: { type: 'string', contentEncoding: 'binary' }
  }
} as const

export default async function community(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/', {
    schema: {
      tags: ['Community'],
      consumes: ['multipart/form-data'],
      body: communityCreateBody
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {

    const { files, fields } = await app.parseMultipartMemory(req);
    console.log('✅ Parsed multipart fields:', fields);
    console.log('✅ Parsed multipart files:', files);

    const community = {
      name: fields.name,
      description: fields.description,

    };

    const communityData = await communityService.createCommunity(community);

    if (files.imageUrl?.length) {
      const imageUrl = await app.saveFileBuffer(files.imageUrl[0], '_community');
      await communityService.updateCommunity(Number(communityData.id), { imageUrl });
      Object.assign(communityData, { imageUrl });
    }

    reply.code(200).send({
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
      body: communityUpdateBody
    },
    preHandler: [onlyOrg]
  },
    async (req, reply) => {

      const { id } = req.params as { id: string };

      // Parse form data (multipart or json)
      const { files, fields } = await app.parseMultipartMemory(req);
      if (!req.isMultipart() && req.body) Object.assign(fields, req.body);

      // Prepare update payload
      const community: { name: string; description?: any; imageUrl?: string } = {
        name: fields.name,
        description: fields.description,
      };

      // Handle thumbnail upload (if provided)
      if (files.imageUrl?.length) {
        community.imageUrl = await app.saveFileBuffer(
          files.imageUrl[0],
          `_community`
        );
      }
      // Update database record
      const communityData = await communityService.updateCommunity(Number(id), community);

      reply.code(200).send({
        success: true,
        message: 'community updated successfully',
        data: communityData,
      });

    }
  );
  app.get('/', { schema: { tags: ['Community'] } },
    async (req, reply) => {

      const communities = await communityService.getCommunity();
      reply.code(200).send({
        success: true,
        message: 'community fetched successfully',
        data: communities,
      });

    });
  app.get('/:id', { schema: { tags: ['Community'] } },

    async (req, reply) => {

      const { id } = req.params as { id: string };
      const numericId = Number(id);

      if (isNaN(numericId)) {
        return reply.code(500).send({
          success: false,
          message: 'Invalid ID',
        });
      }

      const community = await communityService.getCommunityById(numericId);

      reply.code(200).send({
        success: true,
        message: 'community fetched successfully',
        data: community,
      });

    });
  app.patch('/:id/status',
    { schema: { tags: ['Community'] }, preHandler: [onlyOrg] }, async (req, reply) => {

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
        required: ['userId', 'communityId'],
        properties: {
          userId: { type: 'integer', minimum: 1 },
          communityId: { type: 'integer', minimum: 1 }
        }
      }
    }
  }, async (req, reply) => {

    console.log(req.body);

    const { userId, communityId } = (req.body as { userId?: string | number; communityId?: string | number }) ?? {};

    if (!userId || !communityId) {
      return reply.code(400).send({
        success: false,
        message: "userId and communityId are required"
      });
    }

    const result = await communityService.handleCommunityJoin({
      userId: Number(userId),
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
