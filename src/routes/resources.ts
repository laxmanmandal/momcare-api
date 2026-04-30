import { FastifyInstance } from 'fastify'
import * as resourceService from '../services/resourceService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
import {
  conceiveCreateMultipartSchema,
  conceiveIdParamsSchema,
  conceiveTypeParamsSchema,
  conceiveUpdateMultipartSchema,
  validateData
} from '../validations';
import { zodToFormDataParams, zodToMultipartRequestBody } from '../utils/zodFormData'

const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true }
    }
} as const

export default async function resourceRoutes(app: FastifyInstance) {

  app.post(
    '/conceive',
    {
      preHandler: [authMiddleware, onlyOrg],
      schema: {
        tags: ['Resources'],
        consumes: ['multipart/form-data'],
        parameters: zodToFormDataParams(conceiveCreateMultipartSchema as any),
        requestBody: zodToMultipartRequestBody(conceiveCreateMultipartSchema as any),
        body: {
          properties: {
            week: { type: 'number' },
            title: { type: 'string' },
            description: { type: 'string' },
            thumbnail: { type: 'string', format: 'binary' },
            image: { type: 'string', format: 'binary' }
          }
        },
        summary: 'Create a conceive resource',
        response: { 200: successObjectResponse }
      }
    },
    async (req, reply) => {

      const { fields, files } = validateData(
        conceiveCreateMultipartSchema,
        await app.parseMultipartMemory(req)
      );
      const conceiveData = fields;

      const conceive = await resourceService.createConceive(conceiveData);

      if (files.thumbnail?.length && files.image?.length) {
        const [thumbnail, image] = await Promise.all([
          app.saveFileBuffer(files.thumbnail[0], 'conceive'),
          app.saveFileBuffer(files.image[0], 'conceive')
        ]);

        await resourceService.updateConceive(conceive.id, { thumbnail, image });
        Object.assign(conceive, { thumbnail, image });
      }

      reply.code(200).send({
        success: true,
        message: 'Resource created successfully',
        data: conceive
      });

    }
  );
  app.patch(
    '/conceive/:id',
    {
      schema: {
        tags: ['Resources'],
        consumes: ['application/json', 'multipart/form-data'],
        parameters: zodToFormDataParams(conceiveUpdateMultipartSchema as any),
        requestBody: zodToMultipartRequestBody(conceiveUpdateMultipartSchema as any),
        params: {
          type: 'object',
          properties: { id: { type: 'integer' } },
          required: ['id']
        },
        body: {
          properties: {
            week: { type: 'number' },
            title: { type: 'string' },
            description: { type: 'string' },
            thumbnail: { type: 'string', format: 'binary' },
            image: { type: 'string', format: 'binary' }
          }
        },
        summary: 'Update a conceive resource',
        response: { 200: successObjectResponse }
      },
      preHandler: [authMiddleware, onlyOrg]
    },
    async (req, reply) => {

      const { id } = validateData(conceiveIdParamsSchema, req.params);
      const { fields, files } = validateData(
        conceiveUpdateMultipartSchema,
        await app.parseMultipartMemory(req)
      );

      const updateData: any = fields;

      // Handle thumbnail upload (if provided)
      if (files.thumbnail?.length) {
        updateData.thumbnail = await app.saveFileBuffer(
          files.thumbnail[0],
          `conceive`
        );
      }

      // Handle image upload (if provided)
      if (files.image?.length) {
        updateData.image = await app.saveFileBuffer(
          files.image[0],
          `conceive`
        );
      }

      // Update database record
      const updatedConceive = await resourceService.updateConceive(Number(id), updateData);

      reply.code(200).send({
        success: true,
        message: 'Resource updated successfully',
        data: updatedConceive,
      });
    }

  );
  app.get('/conceive/type/:type', {
    preHandler: [authMiddleware],
    schema: {
      tags: ['Resources'],
      params: {
        type: 'object',
        properties: { type: { type: 'string' } },
        required: ['type']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  week: { type: 'number', example: 3 },
                  title: { type: 'string', example: 'Prenatal Guide' },
                  subtitle: { type: 'string', example: 'Prenatal Guide subtitle' },
                  description: { type: 'string', example: 'Prenatal Guide description' },
                  thumbnail: { type: 'string', example: '/conceive/prenatal.jpg' },
                  image: { type: 'string', example: '/conceive/prenatal.jpg' },
                  height: { type: 'string', example: '4cm' },
                  weight: { type: 'string', example: '6gm' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (req, reply) => {
    try {
      const { type } = validateData(conceiveTypeParamsSchema, req.params);
      const conceive = await resourceService.getConceive(type);
      reply.code(200).send({
        success: true,
        message: 'Resources fetched successfully',
        data: conceive,
      });
    } catch (error: any) {
      req.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch Resources',
        error: error.message,
      });
    }
  });
  app.get('/conceive/:id', {
    preHandler: [authMiddleware],
    schema: {
      tags: ['Resources'],
      params: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'number', example: 1 },
                week: { type: 'number', example: 3 },
                title: { type: 'string', example: 'Prenatal Guide' },
                subtitle: { type: 'string', example: 'Prenatal Guide' },
                description: { type: 'string', example: 'Prenatal Guide description' },
                thumbnail: { type: 'string', example: '/conceive/prenatal.jpg' },
                image: { type: 'string', example: '/conceive/prenatal.jpg' },
                height: { type: 'string', example: '4cm' },
                weight: { type: 'string', example: '6gm' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (req, reply) => {
    try {
      const { id } = validateData(conceiveIdParamsSchema, req.params);
      const conceive = await resourceService.getConceiveById(id);

      reply.code(200).send({
        success: true,
        message: 'Resource fetched successfully',
        data: conceive,
      });
    } catch (error: any) {
      req.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch Resource',
        error: error.message,
      });
    }
  });

}
