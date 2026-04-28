import { FastifyInstance } from 'fastify'
import * as mediaservice from '../services/mediaService'
import { authMiddleware, onlyOrg } from '../middleware/auth';

interface MediaSearchQuery {
    query?: string;
    type?: string;
    mimeType?: string;
}

const mediaWriteBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        title: { type: 'string' },
        type: { type: 'string' },
        mimetype: { type: 'string' },
        url: { type: 'string' },
        thumbnail: { type: 'string' }
    }
} as const

export default async function mediaRoutes(app: FastifyInstance) {
    app.addHook('preHandler', authMiddleware);

    app.post('/',
        {
            schema: {
                tags: ['Media Files'],
                consumes: ['multipart/form-data'],
                body: mediaWriteBody
            },
            preHandler: [onlyOrg]
        }, async (req, reply) => {
            try {
                const { files, fields } = await app.parseMultipartMemory(req);

                const mediaData: any = {
                    uuid: await app.uid(fields.type, 'mediaResource'),
                    title: fields.title,
                    type: fields.type,
                    mimeType: fields.mimetype,
                };
                // If URL is provided as text (video/link), use it
                if (fields.url) {
                    mediaData.url = fields.url;
                } else if (files.url?.length) {
                    mediaData.url = await app.saveFileBuffer(files.url[0], 'resources');
                }

                if (fields.thumbnail) {
                    mediaData.thumbnail = fields.thumbnail;
                } else if (files.thumbnail?.length) {
                    mediaData.thumbnail = await app.saveFileBuffer(files.thumbnail[0], 'resources');
                }
                console.log(mediaData);

                const media = await mediaservice.createMedia(mediaData);

                reply.code(200).send({ success: true, message: 'Media resource created successfully', data: media });
            } catch (error: any) {
                req.log.error(error);
                console.log(error);
                reply.code(400).send({ success: false, message: 'Media resource not created', error: error.message });
            }
        });

    app.patch(
        '/:uuid',
        {
            schema: {
                tags: ['Media Files'],
                consumes: ['application/json', 'multipart/form-data'],
                body: mediaWriteBody
            },
            preHandler: [onlyOrg]
        },
        async (req, reply) => {
            try {
                const { uuid } = req.params as { uuid: string };

                // Parse form data (multipart or json)
                const { files, fields } = await app.parseMultipartMemory(req);
                if (!req.isMultipart() && req.body) Object.assign(fields, req.body);

                // Prepare update payload
                const updateData: any = {
                    title: fields.title,
                    type: fields.type,
                    mimeType: fields.mimetype,
                };

                if (fields.url) {
                    updateData.url = fields.url;
                } else if (files.url?.length) {
                    updateData.url = await app.saveFileBuffer(files.url[0], 'resources');
                }

                if (fields.thumbnail) {
                    updateData.thumbnail = fields.thumbnail;
                } else if (files.thumbnail?.length) {
                    updateData.thumbnail = await app.saveFileBuffer(files.thumbnail[0], 'resources');
                }

                // Update database record
                const updatedmedia = await mediaservice.updateMedia(uuid, updateData);

                reply.code(200).send({
                    success: true,
                    message: 'media resource updated successfully',
                    data: updatedmedia,
                });
            } catch (error: any) {
                req.log.error(error);
                reply.code(400).send({
                    success: false,
                    message: 'Failed to update media resource',
                    error: error.message,
                });
            }
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
            if (!uuid || typeof uuid !== 'string' || uuid.trim() === '') {
                return reply.code(500).send({
                    success: false,
                    message: 'Invalid media UUID',
                });
            }

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
                    type: { type: 'string' },
                    mimeType: { type: 'string' }
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
