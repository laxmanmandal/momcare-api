import { FastifyInstance } from 'fastify'
import * as mediaservice from '../services/mediaService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
import createHttpError from 'http-errors';
import {
    assertAllowedFileFields,
    assertAllowedKeys,
    assertAtLeastOneDefined,
    pickDefined,
    readAssetReference,
    readNumber,
    readString
} from '../utils/requestValidation';

interface MediaSearchQuery {
    query?: string;
    type?: string;
    mimeType?: string;
}

const mediaUuidParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['uuid'],
    properties: {
        uuid: { type: 'string', minLength: 2, maxLength: 64 }
    }
} as const

const mediaIdParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: {
        id: { type: 'integer', minimum: 1 }
    }
} as const

const mediaCreateBodySchema = {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'type'],
    properties: {
        title: { type: 'string', minLength: 2, maxLength: 160 },
        type: { type: 'string', minLength: 2, maxLength: 50 },
        mimeType: { type: 'string', maxLength: 100 },
        mimetype: { type: 'string', maxLength: 100 },
        url: { type: 'string', contentEncoding: 'binary' },
        thumbnail: { type: 'string', contentEncoding: 'binary' }
    }
} as const

const mediaUpdateBodySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        title: { type: 'string', minLength: 2, maxLength: 160 },
        type: { type: 'string', minLength: 2, maxLength: 50 },
        mimeType: { type: 'string', maxLength: 100 },
        mimetype: { type: 'string', maxLength: 100 },
        url: { type: 'string', contentEncoding: 'binary' },
        thumbnail: { type: 'string', contentEncoding: 'binary' }
    }
} as const

const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object' }
    }
} as const

export default async function mediaRoutes(app: FastifyInstance) {
    app.addHook('preHandler', authMiddleware);

    app.post('/',
        {
            schema: {
                tags: ['Media Files'],
                consumes: ['multipart/form-data'],
                summary: 'Create a media resource',
                body: mediaCreateBodySchema,
                response: { 201: successObjectResponse }
            },
            preHandler: [onlyOrg]
        }, async (req, reply) => {
            const { files, fields } = await app.parseMultipartMemory(req);
            assertAllowedKeys(fields, ['title', 'type', 'mimeType', 'mimetype', 'url', 'thumbnail'])
            assertAllowedFileFields(files, ['url', 'thumbnail'])

            const mediaData: any = {
                uuid: await app.uid(readString(fields, 'type', { required: true, minLength: 2, maxLength: 50 })!, 'mediaResource'),
                title: readString(fields, 'title', { required: true, minLength: 2, maxLength: 160 })!,
                type: readString(fields, 'type', { required: true, minLength: 2, maxLength: 50 })!,
                mimeType: readString(fields, 'mimeType', { maxLength: 100 }) ?? readString(fields, 'mimetype', { maxLength: 100 }),
            };

            if (files.url?.length) {
                mediaData.url = await app.saveFileBuffer(files.url[0], 'resources');
                mediaData.mimeType = files.url[0].mimetype;
            } else {
                mediaData.url = readAssetReference(fields, 'url');
            }

            if (!mediaData.url) {
                throw createHttpError(400, 'url is required')
            }

            if (files.thumbnail?.length) {
                mediaData.thumbnail = await app.saveFileBuffer(files.thumbnail[0], 'resources');
            } else {
                mediaData.thumbnail = readAssetReference(fields, 'thumbnail');
            }

            const media = await mediaservice.createMedia(mediaData);

            reply.code(201).send({ success: true, message: 'Media resource created successfully', data: media });
        });

    app.patch(
        '/:uuid',
        {
            schema: {
                tags: ['Media Files'],
                consumes: ['application/json', 'multipart/form-data'],
                summary: 'Update a media resource',
                params: mediaUuidParamsSchema,
                body: mediaUpdateBodySchema,
                response: { 200: successObjectResponse }
            },
            preHandler: [onlyOrg]
        },
        async (req, reply) => {
            const { uuid } = req.params as { uuid: string };

            const { files, fields } = await app.parseMultipartMemory(req)
            assertAllowedKeys(fields, ['title', 'type', 'mimeType', 'mimetype', 'url', 'thumbnail'])
            assertAllowedFileFields(files, ['url', 'thumbnail'])

            // Prepare update payload
            const updateData: any = pickDefined({
                title: readString(fields, 'title', { minLength: 2, maxLength: 160 }),
                type: readString(fields, 'type', { minLength: 2, maxLength: 50 }),
                mimeType: readString(fields, 'mimeType', { maxLength: 100 }) ?? readString(fields, 'mimetype', { maxLength: 100 }),
                url: undefined as string | undefined,
                thumbnail: undefined as string | undefined,
            });

            if (files.url?.length) {
                updateData.url = await app.saveFileBuffer(files.url[0], 'resources');
                updateData.mimeType = files.url[0].mimetype;
            } else {
                updateData.url = readAssetReference(fields, 'url');
            }

            if (files.thumbnail?.length) {
                updateData.thumbnail = await app.saveFileBuffer(files.thumbnail[0], 'resources');
            } else {
                updateData.thumbnail = readAssetReference(fields, 'thumbnail');
            }

            assertAtLeastOneDefined(
                Object.entries(updateData),
                'At least one field is required to update the media resource'
            )

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
            params: mediaUuidParamsSchema,
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
            const { uuid } = req.params as { uuid: string };

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
            params: mediaIdParamsSchema,
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
            const { id } = req.params as { id: number };


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
    app.get<{ Querystring: MediaSearchQuery }>('/search', {
        schema: {
            tags: ['Media Files'],
            querystring: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    query: { type: 'string' },
                    type: { type: 'string', minLength: 2, maxLength: 50 },
                    mimeType: { type: 'string', maxLength: 100 }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const results = await mediaservice.search(request.query);
            return reply.send({ success: true, data: results });
        } catch (err: any) {
            console.error(err);
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
}
