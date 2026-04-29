import { FastifyInstance } from 'fastify'
import * as communityService from '../services/communityPosts'
import { authMiddleware } from '../middleware/auth'
import { PostType } from '@prisma/client'
import createHttpError from 'http-errors'
import {
    assertAllowedFileFields,
    assertAllowedKeys,
    assertAtLeastOneDefined,
    pickDefined,
    readEnumString,
    readIdParam,
    readNumber,
    readString
} from '../utils/requestValidation'

// ================= SCHEMAS =================
const postIdParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: {
        id: { type: 'integer', minimum: 1 }
    }
} as const

const communityPostTypes = Object.values(PostType) as [PostType, ...PostType[]]

const postTypeParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['type'],
    properties: {
        type: { type: 'string', enum: communityPostTypes }
    }
} as const

const communityPostCreateBody = {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'content', 'communityId'],
    properties: {
        title: { type: 'string', minLength: 2, maxLength: 160 },
        content: { type: 'string', minLength: 2, maxLength: 10000 },
        communityId: { type: 'integer', minimum: 1 },
        userId: { type: 'integer', minimum: 1 },
        mediaType: { type: 'string', maxLength: 50 },
        type: { type: 'string', enum: communityPostTypes },
        media: { type: 'string', contentEncoding: 'binary' }
    }
} as const

const communityPostUpdateBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        title: { type: 'string', minLength: 2, maxLength: 160 },
        content: { type: 'string', minLength: 2, maxLength: 10000 },
        communityId: { type: 'integer', minimum: 1 },
        userId: { type: 'integer', minimum: 1 },
        mediaType: { type: 'string', maxLength: 50 },
        type: { type: 'string', enum: communityPostTypes },
        media: { type: 'string', contentEncoding: 'binary' }
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

// ================= ROUTES =================
export default async function communityPost(app: FastifyInstance) {

    app.addHook('preHandler', authMiddleware)

    // ================= CREATE =================
    app.post('/', {
        schema: {
            tags: ['Community Posts'],
            summary: 'Create a community post',
            consumes: ['multipart/form-data'],
            body: communityPostCreateBody,
            response: { 201: successObjectResponse }
        }
    }, async (req, reply) => {

        const { files, fields } = await app.parseMultipartMemory(req)

        assertAllowedKeys(fields, ['title', 'content', 'communityId', 'userId', 'mediaType', 'type'])
        assertAllowedFileFields(files, ['media'])

        const userId = readIdParam(req.user?.id, 'userId')

        if (fields.userId && Number(fields.userId) !== userId) {
            throw createHttpError(403, 'Unauthorized user')
        }

        const payload = {
            title: readString(fields, 'title', { required: true, minLength: 2, maxLength: 160 })!,
            content: readString(fields, 'content', { required: true, minLength: 2, maxLength: 10000 })!,
            communityId: readNumber(fields, 'communityId', { required: true, integer: true, min: 1 })!,
            userId,
            mediaType: readString(fields, 'mediaType', { maxLength: 50 }),
            type: readEnumString(fields, 'type', communityPostTypes),
        }

        const data = await communityService.createCommunityPost(payload)

        if (files.media?.length) {
            const media = await app.saveFileBuffer(files.media[0], 'community_posts')
            await communityService.updateCommunityPost(data.id, { media })
            data.media = media
        }

        return reply.code(201).send({
            success: true,
            message: 'Post created',
            data
        })
    })

    // ================= UPDATE =================
    app.patch('/:id', {
        schema: {
            tags: ['Community Posts'],
            summary: 'Update a community post',
            consumes: ['application/json', 'multipart/form-data'],
            params: postIdParamsSchema,
            body: communityPostUpdateBody,
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {

        const { id } = req.params as { id: number }

        let fields: any = {}
        let files: any = {}

        if (req.isMultipart()) {
            ({ fields, files } = await app.parseMultipartMemory(req))
        } else {
            fields = req.body as any
        }

        assertAllowedKeys(fields, ['title', 'content', 'communityId', 'userId', 'mediaType', 'type'])
        assertAllowedFileFields(files, ['media'])

        const userId = readIdParam(req.user?.id, 'userId')

        if (fields.userId && Number(fields.userId) !== userId) {
            throw createHttpError(403, 'Unauthorized user')
        }

        const payload = pickDefined({
            title: readString(fields, 'title', { minLength: 2, maxLength: 160 }),
            content: readString(fields, 'content', { minLength: 2, maxLength: 10000 }),
            communityId: readNumber(fields, 'communityId', { integer: true, min: 1 }),
            userId: fields.userId ? userId : undefined,
            mediaType: readString(fields, 'mediaType', { maxLength: 50 }),
            type: readEnumString(fields, 'type', communityPostTypes),
            media: undefined as string | undefined
        })

        assertAtLeastOneDefined(Object.entries(payload), 'Nothing to update')

        if (files.media?.length) {
            payload.media = await app.saveFileBuffer(files.media[0], 'community_posts')
        }

        const data = await communityService.updateCommunityPost(id, payload)

        return reply.send({
            success: true,
            message: 'Post updated',
            data
        })
    })

    // ================= GET BY TYPE =================
    app.get('/', {
        schema: {
            tags: ['Community Posts'],
            summary: 'List all community posts',
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        const data = await communityService.getCommunityPost()

        return reply.send({
            success: true,
            data
        })
    })

    // ================= GET BY TYPE =================
    app.get('/type/:type', {
        schema: {
            tags: ['Community Posts'],
            summary: 'List community posts by type',
            params: postTypeParamsSchema,
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        const { type } = req.params as { type: PostType }

        const data = await communityService.getPostByType(type)

        return reply.send({
            success: true,
            data
        })
    })

    // ================= USER POSTS =================
    app.get('/user/posts', {
        schema: {
            tags: ['Community Posts'],
            summary: 'List community posts for the authenticated user',
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        const data = await communityService.getPostByUser(req.user?.id)

        return reply.send({
            success: true,
            data
        })
    })

    // ================= BY COMMUNITY =================
    app.get('/community/:id', {
        schema: {
            tags: ['Community Posts'],
            summary: 'List community posts by community ID',
            params: postIdParamsSchema,
            response: { 200: successArrayResponse }
        }
    }, async (req, reply) => {
        const { id } = req.params as { id: number }

        const data = await communityService.getPostByCommunityId(id)

        return reply.send({
            success: true,
            data
        })
    })

    // ================= GET SINGLE =================
    app.get('/:id', {
        schema: {
            tags: ['Community Posts'],
            summary: 'Get a community post by ID',
            params: postIdParamsSchema,
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = req.params as { id: number }

        const data = await communityService.getCommunityPostById(id)

        return reply.send({
            success: true,
            data
        })
    })

    // ================= STATUS =================
    app.patch('/:id/status', {
        schema: {
            tags: ['Community Posts'],
            summary: 'Toggle a community post status',
            params: postIdParamsSchema,
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = req.params as { id: number }

        const data = await communityService.communityPostStatus(id)

        return reply.send({
            success: true,
            message: 'Status updated',
            data
        })
    })
}
