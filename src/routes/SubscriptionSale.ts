import { FastifyInstance } from 'fastify';
import * as service from '../services/SubscriptionSaleService';
import { authMiddleware } from '../middleware/auth';

export default async function subscriptionRoutes(app: FastifyInstance) {
    // Auth applied to all subscription routes
    app.addHook('preHandler', authMiddleware);

    app.get(
        '/:entityId/:page/:limit/purchase',
        {
            schema: { tags: ['AllocationPlan'] },
        },
        async (req: any, reply) => {
            // parse params and convert to numbers
            const receiverId = parseInt(req.params.entityId, 10);
            const page = Math.max(1, parseInt(req.params.page, 10) || 1);
            const limit = Math.max(1, parseInt(req.params.limit, 10) || 10);

            if (Number.isNaN(receiverId)) {
                return reply.code(400).send({ success: false, message: 'Invalid entityId' });
            }

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
            schema: { tags: ['AllocationPlan'] },
        },
        async (req: any, reply) => {
            // parse params and convert to numbers
            const entityId = parseInt(req.params.entityId, 10);
            const planId = parseInt(req.params.planId, 10);

            if (Number.isNaN(entityId)) {
                return reply.code(400).send({ success: false, message: 'Invalid entityId' });
            }
            if (Number.isNaN(planId)) {
                return reply.code(400).send({ success: false, message: 'Invalid Plan' });
            }
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
                required: ['type', 'planId'],
                description: "Create user allotment",
                body: {
                    type: 'object',
                    required: ['type'],
                    properties: {
                        receiverId: { type: 'integer' },
                        userId: { type: 'integer', minimum: 1 },
                        quantity: { type: 'integer' },
                        type: {
                            type: 'string',
                            enum: ['ALLOCATE', 'SELL', 'REVOKE'],
                        },
                        planId: { type: 'integer', minimum: 1 },
                    },

                }

            },
        },
        async (req, reply) => {
            await service.createPlanAllocation(req.body, req.user);

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

                body: {
                    type: "object",
                    required: ["amount", "planId"],
                    properties: {
                        amount: {
                            type: "number",
                            minimum: 1
                        },
                        planId: {
                            type: "number",
                            minimum: 1
                        },
                        coupon_code: {
                            type: "string",
                            nullable: true
                        }

                    }
                },

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
            const { amount } = req.body as { amount: number };
            const { planId } = req.body as { planId: number };
            const { coupon_code } = req.body as { coupon_code?: string };
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

                body: {
                    type: "object",
                    required: ["amount", "planId"],
                    properties: {
                        amount: {
                            type: "number",
                            minimum: 1
                        },
                        planId: {
                            type: "number",
                            minimum: 1
                        },
                        coupon_code: {
                            type: "string",
                            nullable: true
                        }

                    }
                },

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
            const { amount } = req.body as { amount: number };
            const { planId } = req.body as { planId: number };
            const { coupon_code } = req.body as { coupon_code: string };
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

                body: {
                    type: "object",
                    required: ["razorpay_order_id", "razorpay_payment_id", "razorpay_signature"],
                    properties: {
                        razorpay_order_id: { type: "string" },
                        razorpay_payment_id: { type: "string" },
                        razorpay_signature: { type: "string" },

                    }
                },
            }
        },
        async (req, reply) => {

            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as { razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string };

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
