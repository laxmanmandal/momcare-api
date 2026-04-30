import { Role } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import * as couponService from '../services/couponService';
import { authMiddleware, onlyOrg } from '../middleware/auth';
import { zodToJsonSchema } from '../utils/zodOpenApi';
import {
    couponCodeParamsSchema,
    couponCreateMultipartSchema,
    couponIdParamsSchema,
    couponProcessSchema,
    couponUpdateMultipartSchema,
    validateData
} from '../validations';

const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true }
    }
} as const;

const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object', additionalProperties: true } }
    }
} as const;

export default async function CouponRoute(app: FastifyInstance) {
    app.post(
        '/create',
        {
            preHandler: [authMiddleware, onlyOrg],
            schema: {
                tags: ['Coupon'],
                consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
                body: zodToJsonSchema(couponCreateMultipartSchema as any, { target: 'openApi3' }),
                summary: 'Create a coupon',
                response: { 201: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { fields, files } = validateData(
                couponCreateMultipartSchema,
                await app.parseMultipartMemory(req)
            );

            const coupon = await couponService.createCoupon(fields);

            if (coupon && files.image?.length) {
                const image = await app.saveFileBuffer(files.image[0], '_coupons');
                await couponService.updateCoupon(Number(coupon.id), { image });
                coupon.image = image;
            }

            return reply.code(201).send({
                success: true,
                message: 'Coupon created successfully',
                data: coupon
            });
        }
    );

    app.post(
        '/process',
        {
            preHandler: [authMiddleware],
            schema: {
                tags: ['Coupon'],
                summary: 'Validate coupon and calculate final price',
                consumes: ['application/json', 'application/x-www-form-urlencoded'],
                body: zodToJsonSchema(couponProcessSchema as any, { target: 'openApi3' }),
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            data: {
                                type: 'object',
                                properties: {
                                    isValid: { type: 'boolean' },
                                    message: { type: 'string' },
                                    originalAmount: { type: 'number', nullable: true },
                                    discountAmount: { type: 'number', nullable: true },
                                    finalAmount: { type: 'number', nullable: true },
                                    coupon: {
                                        type: 'object',
                                        nullable: true,
                                        properties: {
                                            code: { type: 'string' },
                                            percent: { type: 'number', nullable: true },
                                            fixed_amount: { type: 'number', nullable: true }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    500: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    }
                }
            }
        },
        async (req, reply) => {
            const { couponCode, planId } = validateData(couponProcessSchema, req.body ?? {});
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

    app.get(
        '/',
        {
            schema: {
                tags: ['Coupon'],
                summary: 'List coupons',
                response: { 200: successArrayResponse }
            }
        },
        async (_req, reply) => {
            const coupons = await couponService.getCoupons();
            reply.code(200).send({
                success: true,
                message: 'coupons fetched successfully',
                data: coupons
            });
        }
    );

    app.get(
        '/:coupon_code',
        {
            schema: {
                tags: ['Coupon'],
                params: zodToJsonSchema(couponCodeParamsSchema as any, { target: 'openApi3' }),
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { coupon_code } = validateData(couponCodeParamsSchema, req.params);
            const coupon = await couponService.getCouponByCode(coupon_code);

            reply.code(200).send({
                success: true,
                message: 'Coupon fetched successfully',
                data: coupon
            });
        }
    );

    app.patch(
        '/:id',
        {
            preHandler: [authMiddleware, onlyOrg],
            schema: {
                tags: ['Coupon'],
                consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
                body: zodToJsonSchema(couponUpdateMultipartSchema as any, { target: 'openApi3' }),
                params: zodToJsonSchema(couponIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Update a coupon',
                response: { 200: successObjectResponse }
            }
        },
        async (req, reply) => {
            const { id } = validateData(couponIdParamsSchema, req.params);
            const { fields, files } = validateData(
                couponUpdateMultipartSchema,
                await app.parseMultipartMemory(req)
            );

            const coupon = await couponService.updateCoupon(id, fields);

            if (files.image?.length) {
                coupon.image = await app.saveFileBuffer(files.image[0], '_coupons');
                await couponService.updateCoupon(id, { image: coupon.image });
            }

            return reply.code(200).send({
                success: true,
                message: 'Coupon Updated successfully',
                data: coupon
            });
        }
    );

    app.patch(
        '/:id/status',
        {
            schema: {
                tags: ['Coupon'],
                consumes: ['application/json', 'application/x-www-form-urlencoded'],
                params: zodToJsonSchema(couponIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Toggle coupon status',
                response: { 200: successObjectResponse }
            },
            preHandler: [authMiddleware, onlyOrg]
        },
        async (req, reply) => {
            const { id } = validateData(couponIdParamsSchema, req.params);
            const coupon = await couponService.CouponStatus(Number(id), reply);
            return reply.send({ success: true, message: 'Coupon status updated successfully', data: coupon });
        }
    );

    app.delete(
        '/delete/:id',
        {
            schema: {
                tags: ['Coupon'],
                consumes: ['application/json', 'application/x-www-form-urlencoded'],
                params: zodToJsonSchema(couponIdParamsSchema as any, { target: 'openApi3' }),
                summary: 'Delete a coupon',
                response: { 200: successObjectResponse }
            },
            preHandler: [authMiddleware, onlyOrg]
        },
        async (req, reply) => {
            const { id } = validateData(couponIdParamsSchema, req.params);
            await couponService.deleteCoupon(Number(id));
            return reply.send({ success: true, message: 'Coupon deleted successfully' });
        }
    );
}
