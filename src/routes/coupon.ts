import { FastifyInstance } from 'fastify'
import * as couponService from '../services/couponService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
import { Role } from '@prisma/client';
import createHttpError from 'http-errors';
import {
    assertAllowedFileFields,
    assertAllowedKeys,
    pickDefined,
    readDateValue,
    readNullableNumber,
    readNumber,
    readString
} from '../utils/requestValidation';

const couponIdParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: {
        id: { type: 'integer', minimum: 1 }
    }
} as const

const couponBodySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        code: { type: 'string', minLength: 3, maxLength: 50 },
        percent: { type: 'number', minimum: 0, maximum: 100, nullable: true },
        fixed_amount: { type: 'number', minimum: 0, nullable: true },
        assigned_user_id: { type: 'integer', minimum: 1, nullable: true },
        effective_at: { type: 'string', format: 'date-time' },
        expires_at: { type: 'string', format: 'date-time' },
        image: { type: 'string', contentEncoding: 'binary' }
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

const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object' } }
    }
} as const

export default async function CouponRoute(app: FastifyInstance) {
    function buildCouponPayload(fields: Record<string, unknown>, isCreate: boolean) {
        assertAllowedKeys(fields, [
            'code',
            'percent',
            'fixed_amount',
            'assigned_user_id',
            'effective_at',
            'expires_at'
        ])

        const code = readString(fields, 'code', { required: isCreate, minLength: 3, maxLength: 50, pattern: /^[A-Za-z0-9_-]+$/ })
        const percent = readNullableNumber(fields, 'percent', { min: 0, max: 100 })
        const fixedAmount = readNullableNumber(fields, 'fixed_amount', { min: 0 })
        const assignedUserId = readNullableNumber(fields, 'assigned_user_id', { min: 1, integer: true })
        const effectiveAt = readDateValue(fields, 'effective_at', isCreate)
        const expiresAt = readDateValue(fields, 'expires_at', isCreate)

        if (isCreate) {
            if (percent === null && fixedAmount === null) {
                throw createHttpError(400, 'Either percent or fixed_amount is required')
            }

            if (percent !== null && percent !== undefined && fixedAmount !== null && fixedAmount !== undefined) {
                throw createHttpError(400, 'Percent and fixed_amount cannot both be provided')
            }
        } else if (percent !== undefined || fixedAmount !== undefined) {
            if (percent !== null && percent !== undefined && fixedAmount !== null && fixedAmount !== undefined) {
                throw createHttpError(400, 'Percent and fixed_amount cannot both be provided')
            }

            if (percent === null && fixedAmount === null) {
                throw createHttpError(400, 'At least one discount value must remain set')
            }
        }

        if (effectiveAt && expiresAt && effectiveAt > expiresAt) {
            throw createHttpError(400, 'effective_at must be before or equal to expires_at')
        }

        return pickDefined({
            code,
            percent,
            fixed_amount: fixedAmount,
            assigned_user_id: assignedUserId,
            effective_at: effectiveAt,
            expires_at: expiresAt
        })
    }

    app.post(
        '/create',
        {
            preHandler: [authMiddleware, onlyOrg],
            schema: {
                tags: ['Coupon'],
                consumes: ['multipart/form-data'],
                summary: 'Create a coupon',
                body: couponBodySchema,
                response: { 201: successObjectResponse }
            },
        },
        async (req, reply) => {

            const { files, fields } = await app.parseMultipartMemory(req);
            assertAllowedFileFields(files, ['image'])

            const coupon = await couponService.createCoupon(buildCouponPayload(fields, true));

            if (coupon && files.image?.length) {
                const image = await app.saveFileBuffer(files.image[0], '_coupons');
                await couponService.updateCoupon(Number(coupon.id), { image });
                coupon.image = image;
            }

            return reply.code(201).send({
                success: true,
                message: 'Coupon created successfully',
                data: coupon,
            });

        }
    );


    app.post(
        "/process",
        {
            preHandler: [authMiddleware],
            schema: {
                tags: ["Coupon"],
                summary: "Validate coupon and calculate final price",
                body: {
                    type: "object",
                    required: ["planId"],
                    additionalProperties: false,
                    properties: {
                        couponCode: { type: "string", minLength: 3, maxLength: 50 },
                        planId: { type: "integer", minimum: 1 }
                    }
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    isValid: { type: "boolean" },
                                    message: { type: "string" },
                                    originalAmount: { type: "number", nullable: true },
                                    discountAmount: { type: "number", nullable: true },
                                    finalAmount: { type: "number", nullable: true },
                                    coupon: {
                                        type: "object",
                                        nullable: true,
                                        properties: {
                                            code: { type: "string" },
                                            percent: { type: "number", nullable: true },
                                            fixed_amount: { type: "number", nullable: true }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    500: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" }
                        }
                    }
                }
            }
        },

        async (req, reply) => {

            const { couponCode, planId } = req.body as {
                couponCode: string;
                planId: number;
            };
            const user = (req as any).user;
            const userId = user.id;

            const result = await couponService.calculateFinalPrice({
                couponCode,
                planId,
                userId
            });

            return reply.send({
                success: true,
                data: result
            });

        }
    );

    app.get(
        '/available',
        {
            preHandler: [authMiddleware],
            schema: {
                tags: ['Coupon'],
                summary: 'Get available coupons for user',
                description: 'Returns all valid coupons available to the authenticated user',
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            data: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        code: { type: 'string' },
                                        discountType: { type: 'string', enum: ['percentage', 'fixed'] },
                                        discountValue: { type: 'number' },
                                        description: { type: 'string' },
                                        validUntil: { type: 'string', format: 'date-time' },
                                        isAssigned: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    },
                    500: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            data: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        code: { type: 'string' },
                                        discountType: { type: 'string', enum: ['percentage', 'fixed'] },
                                        discountValue: { type: 'number' },
                                        description: { type: 'string' },
                                        validUntil: { type: 'string', format: 'date-time' },
                                        isAssigned: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        async (req, reply) => {
            const user = (req as any).user;
            const userId = user.role === Role.USER ? user.id : user.belongsToId;
            const coupons = await couponService.getUserCoupons(userId);

            return reply.send({
                success: true,
                data: coupons
            });

        }
    );

    app.get('/', {
        schema: {
            tags: ['Coupon'],
            summary: 'List coupons',
            response: { 200: successArrayResponse }
        },
    },
        async (req, reply) => {

            const dailytips = await couponService.getCoupons();
            reply.code(200).send({
                success: true,
                message: 'coupons fetched successfully',
                data: dailytips,
            });
        });
    app.get('/:coupon_code', {
        schema: {
            tags: ['Coupon'],
            params: {
                type: 'object',
                properties: {
                    coupon_code: { type: 'string' }
                },
                required: ['coupon_code']
            }
        }
    },

        async (req, reply) => {
            const { coupon_code } = req.params as { coupon_code: string };
            const dailytips = await couponService.getCouponByCode(coupon_code);

            reply.code(200).send({
                success: true,
                message: 'Coupon fetched successfully',
                data: dailytips,
            });
        });
    app.patch(
        '/:id',
        {
            preHandler: [authMiddleware, onlyOrg],
            schema: {
                tags: ['Coupon'],
                consumes: ['application/json', 'multipart/form-data'],
                summary: 'Update a coupon',
                params: couponIdParamsSchema,
                body: couponBodySchema,
                response: { 200: successObjectResponse }
            },
        },
        async (req, reply) => {

            const { files, fields } = await app.parseMultipartMemory(req);
            const { id } = req.params as { id: number };
            assertAllowedFileFields(files, ['image'])

            const coupon = await couponService.updateCoupon(id, buildCouponPayload(fields, false));

            if (files.image?.length) {
                coupon.image = await app.saveFileBuffer(files.image[0], '_coupons');
                await couponService.updateCoupon(id, { image: coupon.image });
            }

            return reply.code(200).send({
                success: true,
                message: 'Coupon Updated successfully',
                data: coupon,
            });
        }


    );
    app.patch('/:id/status', {
        schema: {
            tags: ['Coupon'],
            summary: 'Toggle coupon status',
            params: couponIdParamsSchema,
            response: { 200: successObjectResponse }
        },
        preHandler: [authMiddleware, onlyOrg]
    }, async (req, reply) => {
        const { id } = req.params as { id: number };

        const coupon = await couponService.CouponStatus(Number(id), reply);
        return reply.send({ success: true, message: 'Coupon status updated successfully', data: coupon });
    });
    app.delete('/delete/:id', {
        schema: {
            tags: ['Coupon'],
            summary: 'Delete a coupon',
            params: couponIdParamsSchema,
            response: { 200: successObjectResponse }
        }, preHandler: [authMiddleware, onlyOrg]
    }, async (req, reply) => {
        const { id } = req.params as { id: number };
        await couponService.deleteCoupon(Number(id));
        return reply.send({ success: true, message: 'Coupon deleted successfully' });
    });
}
