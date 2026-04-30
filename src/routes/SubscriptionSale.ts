import { FastifyInstance } from 'fastify';
import * as service from '../services/SubscriptionSaleService';
import { authMiddleware } from '../middleware/auth';
import {
    positiveIntSchema,
    subscriptionAllotmentSchema,
    subscriptionAllocationCreateSchema,
    subscriptionConfirmPaymentSchema,
    validateData
} from '../validations';
import { zodToJsonSchema } from 'zod-to-json-schema'

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

const errorResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        error: { type: 'string' }
    }
} as const

export default async function subscriptionRoutes(app: FastifyInstance) {
    // Auth applied to all subscription routes
    app.addHook('preHandler', authMiddleware);

    app.get(
        '/:entityId/:page/:limit/purchase',
        {
            schema: {
                tags: ['AllocationPlan'],
                summary: 'List purchase transactions by entity',
                response: { 200: successObjectResponse, 400: errorResponse }
            },
        },
        async (req: any, reply) => {
            const receiverId = validateData(positiveIntSchema, req.params.entityId);
            const page = validateData(positiveIntSchema, req.params.page);
            const limit = validateData(positiveIntSchema, req.params.limit);

            try {
                const subscriptions = await service.getSaleTransaction(req.user, receiverId, page, limit);
                return reply.code(200).send({
                    success: true,
                    message: 'User subscriptions fetched successfully',
                    data: subscriptions,
                });
            } catch (error: any) {
                return reply.code(400).send({
                    success: false,
                    message: 'Failed to fetch user subscriptions',
                    error: error?.message ?? String(error),
                });
            }
        }
    );
    app.get(
        '/:entityId/:planId',
        {
            schema: {
                tags: ['AllocationPlan'],
                summary: 'Get plan-wise balance for an entity',
                response: { 200: successObjectResponse, 400: errorResponse }
            },
        },
        async (req: any, reply) => {
            const entityId = validateData(positiveIntSchema, req.params.entityId);
            const planId = validateData(positiveIntSchema, req.params.planId);
            try {
                const subscriptions = await service.getPlanWiseBalance(entityId, planId);
                return reply.code(200).send({
                    success: true,
                    message: 'Successfully fetch',
                    data: subscriptions,
                });
            } catch (error: any) {
                return reply.code(400).send({
                    success: false,
                    message: 'Failed to fetch subscriptions',
                    error: error?.message ?? String(error),
                });
            }
        }
    );
    app.post(
        '/create',
        {
            preHandler: [authMiddleware, app.accessControl.check('PLAN_ALLOCATION')],
            schema: {
                tags: ['AllocationPlan'],
                description: "Create user allotment",
                body: zodToJsonSchema(subscriptionAllocationCreateSchema as any, 'subscriptionAllocationCreateBody')
            },
        },
        async (req, reply) => {
            const body = validateData(subscriptionAllocationCreateSchema, req.body ?? {});
            await service.createPlanAllocation(body, req.user);

            return reply.code(201).send({
                success: true,
                message: 'User subscribed to plan successfully',
            });

        }
    );

    app.post(
        "/user/allotment",
        {
            preHandler: [authMiddleware],
            schema: {
                description: "Create user allotment",
                tags: ["Payments"],
                body: zodToJsonSchema(subscriptionAllotmentSchema as any, 'subscriptionAllotmentBody'),
                response: {
                    200: {
                        type: "object",
                        properties: {
                            razorpay_order_id: { type: "string" },
                            amount: { type: "number" },
                            currency: { type: "string" },
                            key: { type: "string" }
                        }
                    }
                }
            }
        },
        async (req, reply) => {
            const user = (req as any).user;
            const { amount, planId, coupon_code } = validateData(subscriptionAllotmentSchema, req.body ?? {});
            const result = await service.appAllotment(user.id, amount, planId, coupon_code);
            return reply.send(result);
        }
    );
    app.post(
        "/payments/create",
        {
            preHandler: [authMiddleware, app.accessControl.check('MAKE_PAYMENT')],
            schema: {
                description: "Create Razorpay order and payment intent",
                tags: ["Payments"],
                response: {
                    200: {
                        type: "object",
                        properties: {
                            razorpay_order_id: { type: "string" },
                            amount: { type: "number" },
                            currency: { type: "string" },
                            key: { type: "string" }
                        }
                    }
                }
            }
        },
        async (req, reply) => {
            const user = (req as any).user;
            const { amount, planId, coupon_code } = validateData(subscriptionAllotmentSchema, req.body ?? {});
            const result = await service.createPaymentOrder(user.id, amount, planId, coupon_code);
            return reply.send(result);
        }
    );
    app.post(
        "/payments/confirm-payment",
        {
            preHandler: [authMiddleware, app.accessControl.check('CONFIRM_PAYMENT')],
            schema: {
                description: "Confirm Razorpay payment",
                tags: ["Payments"],
                body: zodToJsonSchema(subscriptionConfirmPaymentSchema as any, 'subscriptionConfirmPaymentBody')
            }
        },
        async (req, reply) => {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = validateData(subscriptionConfirmPaymentSchema, req.body ?? {});

            const result = await service.confirmPayment(
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                req as any
            );

            return reply.send(result);
        }
    );


}
