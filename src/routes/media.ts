import { FastifyInstance } from 'fastify'
import * as mediaservice from '../services/mediaService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
import { zodToJsonSchema } from '../utils/zodOpenApi';
import {
    mediaCreateMultipartSchema,
    mediaIdParamsSchema,
    mediaParamsSchema,
    mediaSearchQuerySchema,
    mediaUpdateMultipartSchema,
    validateData
} from '../validations';

const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true }
    }
} as const

export default async function mediaRoutes(app: FastifyInstance) {
    app.addHook('preHandler', authMiddleware);

    app.post('/',
        {
            schema: {
                tags: ['Media Files'],
                consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
                summary: 'Create a media resource',
                body: zodToJsonSchema(mediaCreateMultipartSchema as any, { target: 'openApi3' }),
                response: { 201: successObjectResponse }
            },
            preHandler: [onlyOrg]
        }, async (req, reply) => {
            const { fields, files } = validateData(
                mediaCreateMultipartSchema,
                await app.parseMultipartMemory(req)
            );

            const mediaData: any = {
                uuid: await app.uid(fields.type, 'mediaResource'),
                title: fields.title,
                type: fields.type,
                mimeType: fields.mimeType ?? fields.mimetype,
            };

            if (files.url?.length) {
                mediaData.url = await app.saveFileBuffer(files.url[0], 'resources');
                mediaData.mimeType = files.url[0].mimetype;
            } else {
                mediaData.url = fields.url;
            }

            if (files.thumbnail?.length) {
                mediaData.thumbnail = await app.saveFileBuffer(files.thumbnail[0], 'resources');
            } else {
                mediaData.thumbnail = fields.thumbnail;
            }

            const media = await mediaservice.createMedia(mediaData);

            reply.code(201).send({ success: true, message: 'Media resource created successfully', data: media });
        });

    app.patch(
        '/:uuid',
        {
            schema: {
                tags: ['Media Files'],
                consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
                summary: 'Update a media resource',
                body: zodToJsonSchema(mediaUpdateMultipartSchema as any, { target: 'openApi3' }),
                params: zodToJsonSchema(mediaParamsSchema as any, { target: 'openApi3' }),
                response: { 200: successObjectResponse }
            },
            preHandler: [onlyOrg]
        },
        async (req, reply) => {
            const { uuid } = validateData(mediaParamsSchema, req.params);

            const { fields, files } = validateData(
                mediaUpdateMultipartSchema,
                await app.parseMultipartMemory(req)
            );

            // Prepare update payload
            const updateData: any = {
                title: fields.title,
                type: fields.type,
                mimeType: fields.mimeType ?? fields.mimetype,
                url: undefined as string | undefined,
                thumbnail: undefined as string | undefined,
            };

            if (files.url?.length) {
                updateData.url = await app.saveFileBuffer(files.url[0], 'resources');
                updateData.mimeType = files.url[0].mimetype;
            } else {
                updateData.url = fields.url;
            }

            if (files.thumbnail?.length) {
                updateData.thumbnail = await app.saveFileBuffer(files.thumbnail[0], 'resources');
            } else {
                updateData.thumbnail = fields.thumbnail;
            }

            // Update database record
            const updatedmedia = await mediaservice.updateMedia(uuid, updateData);

            reply.code(200).send({
                success: true,
                message: 'media resource updated successfully',
                data: updatedmedia,
            });
        }
    );
    app.get('/', {
        schema: {
            tags: ['Media Files'],
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
                                    title: { type: 'string', example: 'title of the media' },
                                    uuid: { type: 'string', example: 'BG42334' },
                                    type: { type: 'string', example: 'image,pdf,video' },
                                    url: { type: 'string', example: '/resources/prenatal.jpg' },
                                    thumbnail: { type: 'string', example: '/resources/prenatal.jpg' },
                                    mimeType: { type: 'string', example: '4cm' },
                                    created_at: { type: 'string', example: '4cm' },
                                    updated_at: { type: 'string', example: 'data time format' }
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
            const media = await mediaservice.getMedia();
            reply.code(200).send({
                success: true,
                message: 'media resources fetched successfully',
                data: media,
            });
        } catch (error: any) {
            req.log.error(error);
            reply.code(500).send({
                success: false,
                message: 'Failed to fetch media resources',
                error: error.message,
            });
        }
    });
    app.get('/:uuid', {
        schema: {
            tags: ['Media Files'],
            params: zodToJsonSchema(mediaParamsSchema as any, { target: 'openApi3' }),
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
                                title: { type: 'string', example: 'title of the media' },
                                uuid: { type: 'string', example: 'BG42334' },
                                type: { type: 'string', example: 'image,pdf,video' },
                                url: { type: 'string', example: '/prenatal.jpg' },
                                thumbnail: { type: 'string', example: '/prenatal.jpg' },
                                mimeType: { type: 'string', example: '4cm' },
                                createdAt: { type: 'string', format: 'date-time' },
                                updatedAt: { type: 'string', format: 'date-time' },

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
            const { uuid } = validateData(mediaParamsSchema, req.params);

            const media = await mediaservice.getMediaByuuid(uuid);

            reply.code(200).send({
                success: true,
                message: 'media resource fetched successfully',
                data: media,
            });
        } catch (error: any) {
            req.log.error(error);
            reply.code(500).send({
                success: false,
                message: 'Failed to fetch media resource',
                error: error.message,
            });
        }
    });
    app.get('/mediaId/:id', {
        schema: {
            tags: ['Media Files'],
            params: zodToJsonSchema(mediaIdParamsSchema as any, { target: 'openApi3' }),
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
                                uuid: { type: 'string', example: 'BG42334' },
                                type: { type: 'string', example: 'image,pdf,video' },
                                url: { type: 'string', example: '/resources/prenatal.jpg' },
                                thumbnail: { type: 'string', example: '/resources/prenatal.jpg' },
                                mimeType: { type: 'string', example: '4cm' },
                                createdAt: { type: 'string', format: 'date-time' },
                                updatedAt: { type: 'string', format: 'date-time' },

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
            const { id } = validateData(mediaIdParamsSchema, req.params);


            const media = await mediaservice.getMediaById(id);

            reply.code(200).send({
                success: true,
                message: 'media resource fetched successfully',
                data: media,
            });
        } catch (error: any) {
            req.log.error(error);
            reply.code(500).send({
                success: false,
                message: 'Failed to fetch media resource',
                error: error.message,
            });
        }
    });
    app.get('/search', {
        schema: {
            tags: ['Media Files'],
            querystring: zodToJsonSchema(mediaSearchQuerySchema as any, { target: 'openApi3' })
        }
    }, async (request, reply) => {
        try {
            const query = validateData(mediaSearchQuerySchema, request.query);
            const results = await mediaservice.search(query);
            return reply.send({ success: true, data: results });
        } catch (err: any) {
            console.error(err);
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
}
