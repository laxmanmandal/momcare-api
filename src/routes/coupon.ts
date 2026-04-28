import { FastifyInstance } from 'fastify'
import * as couponService from '../services/couponService'
import { authMiddleware, onlyOrg } from '../middleware/auth';
import { Role } from '@prisma/client';

const couponWriteBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        code: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        percent: { type: 'number' },
        fixed_amount: { type: 'number' },
        assigned_user_id: { type: 'integer', minimum: 1 },
        effective_at: { type: 'string', format: 'date-time' },
        expires_at: { type: 'string', format: 'date-time' },
        image: { type: 'string', contentEncoding: 'binary' }
    }
} as const

export default async function CouponRoute(app: FastifyInstance) {

    function normalizeNumber(input: any) {
        if (input === null || input === undefined) return null;

        if (typeof input === 'string') {
            const trimmed = input.trim();

            if (trimmed === '' || trimmed.toLowerCase() === 'null') return null;

            const parsed = Number(trimmed);
            return Number.isFinite(parsed) ? parsed : null;
        }

        if (typeof input === 'number') {
            return Number.isFinite(input) ? input : null;
        }

        return null;
    }

    app.post(
        '/create',
        {
            preHandler: [authMiddleware, onlyOrg],
            schema: {
                tags: ['Coupon'],
                consumes: ['multipart/form-data'],
                body: couponWriteBody
            },
        },
        async (req, reply) => {

            const { files, fields } = await app.parseMultipartMemory(req);

            // Simple fix: Convert empty strings to null for decimal fields
            const fixedData = {
                ...fields,
                percent: fields.percent === '' ? null : fields.percent,
                fixed_amount: fields.fixed_amount === '' ? null : fields.fixed_amount,
                assigned_user_id: normalizeNumber(fields.assigned_user_id)
            };
            // inside your route handler
            const percent = normalizeNumber(fields.percent);
            const fixedAmount = normalizeNumber(fields.fixed_amount);


            if (percent !== null && fixedAmount !== null) {
                return reply.send({
                    success: false,
                    message: "Percent and fixed amount both cannot be provided"
                });
            }
            if (percent === null && fixedAmount === null) {
                return reply.send({
                    success: false,
                    message: "Percent or fixed amount is required"
                });
            }

            const coupon = await couponService.createCoupon(fixedData);

            if (coupon && files.image?.length) {
                const image = await app.saveFileBuffer(files.image[0], '_coupons');
                await couponService.updateCoupon(Number(coupon.id), { image });
                coupon.image = image;
            }

            return reply.code(200).send({
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
                    properties: {
                        couponCode: { type: "string" },
                        planId: { type: "number" }
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
        schema: { tags: ['Coupon'] },
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
                body: couponWriteBody
            },
        },
        async (req, reply) => {

            const { files, fields } = await app.parseMultipartMemory(req);
            const { id } = req.params as { id: string };
            if (!req.isMultipart() && req.body) Object.assign(fields, req.body);

            // Simple fix: Convert empty strings to null for decimal fields
            const fixedData = {
                ...fields,
                percent: fields.percent === '' ? null : fields.percent,
                fixed_amount: fields.fixed_amount === '' ? null : fields.fixed_amount,
                assigned_user_id: normalizeNumber(fields.assigned_user_id)
            };
            // inside your route handler
            const percent = normalizeNumber(fields.percent);
            const fixedAmount = normalizeNumber(fields.fixed_amount);


            if (percent !== null && fixedAmount !== null) {
                return reply.send({
                    success: false,
                    message: "Percent and fixed amount both cannot be provided"
                });
            }
            if (percent === null && fixedAmount === null) {
                return reply.send({
                    success: false,
                    message: "Percent or fixed amount is required"
                });
            }
            console.log(fixedData);

            const coupon = await couponService.updateCoupon(Number(id), fixedData);

            if (files.image?.length) {
                coupon.image = await app.saveFileBuffer(files.image[0], '_coupons');
            }

            return reply.code(200).send({
                success: true,
                message: 'Coupon Updated successfully',
                data: coupon,
            });
        }


    );
    app.patch('/:id/status', {
        schema: { tags: ['Coupon'] },
        preHandler: [authMiddleware, onlyOrg]
    }, async (req, reply) => {
        const { id } = req.params as { id: number };

        const coupon = await couponService.CouponStatus(Number(id), reply);
        return reply.send({ success: true, message: 'Coupon status updated successfully', data: coupon });
    });
    app.delete('/delete/:id', { schema: { tags: ['Coupon'] }, preHandler: [authMiddleware, onlyOrg] }, async (req, reply) => {
        const { id } = req.params as { id: number };
        await couponService.deleteCoupon(Number(id));
        return reply.send({ success: true, message: 'Coupon deleted successfully' });
    });
}
