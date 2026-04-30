"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = subscriptionRoutes;
const service = __importStar(require("../services/SubscriptionSaleService"));
const auth_1 = require("../middleware/auth");
const zodOpenApi_1 = require("../utils/zodOpenApi");
const validations_1 = require("../validations");
const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true }
    }
};
const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object', additionalProperties: true } }
    }
};
const errorResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        error: { type: 'string' }
    }
};
async function subscriptionRoutes(app) {
    // Auth applied to all subscription routes
    app.addHook('preHandler', auth_1.authMiddleware);
    app.get('/:entityId/:page/:limit/purchase', {
        schema: {
            tags: ['AllocationPlan'],
            summary: 'List purchase transactions by entity',
            response: { 200: successObjectResponse, 400: errorResponse }
        },
    }, async (req, reply) => {
        const receiverId = (0, validations_1.validateData)(validations_1.positiveIntSchema, req.params.entityId);
        const page = (0, validations_1.validateData)(validations_1.positiveIntSchema, req.params.page);
        const limit = (0, validations_1.validateData)(validations_1.positiveIntSchema, req.params.limit);
        try {
            const subscriptions = await service.getSaleTransaction(req.user, receiverId, page, limit);
            return reply.code(200).send({
                success: true,
                message: 'User subscriptions fetched successfully',
                data: subscriptions,
            });
        }
        catch (error) {
            return reply.code(400).send({
                success: false,
                message: 'Failed to fetch user subscriptions',
                error: error?.message ?? String(error),
            });
        }
    });
    app.get('/:entityId/:planId', {
        schema: {
            tags: ['AllocationPlan'],
            summary: 'Get plan-wise balance for an entity',
            response: { 200: successObjectResponse, 400: errorResponse }
        },
    }, async (req, reply) => {
        const entityId = (0, validations_1.validateData)(validations_1.positiveIntSchema, req.params.entityId);
        const planId = (0, validations_1.validateData)(validations_1.positiveIntSchema, req.params.planId);
        try {
            const subscriptions = await service.getPlanWiseBalance(entityId, planId);
            return reply.code(200).send({
                success: true,
                message: 'Successfully fetch',
                data: subscriptions,
            });
        }
        catch (error) {
            return reply.code(400).send({
                success: false,
                message: 'Failed to fetch subscriptions',
                error: error?.message ?? String(error),
            });
        }
    });
    app.post('/create', {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('PLAN_ALLOCATION')],
        schema: {
            tags: ['AllocationPlan'],
            description: "Create user allotment",
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            body: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.subscriptionAllocationCreateSchema, { target: 'openApi3' }),
        },
    }, async (req, reply) => {
        const body = (0, validations_1.validateData)(validations_1.subscriptionAllocationCreateSchema, req.body ?? {});
        await service.createPlanAllocation(body, req.user);
        return reply.code(201).send({
            success: true,
            message: 'User subscribed to plan successfully',
        });
    });
    app.post("/user/allotment", {
        preHandler: [auth_1.authMiddleware],
        schema: {
            description: "Create user allotment",
            tags: ["Payments"],
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            body: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.subscriptionAllotmentSchema, { target: 'openApi3' }),
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
    }, async (req, reply) => {
        const user = req.user;
        const { amount, planId, coupon_code } = (0, validations_1.validateData)(validations_1.subscriptionAllotmentSchema, req.body ?? {});
        const result = await service.appAllotment(user.id, amount, planId, coupon_code);
        return reply.send(result);
    });
    app.post("/payments/create", {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('MAKE_PAYMENT')],
        schema: {
            description: "Create Razorpay order and payment intent",
            tags: ["Payments"],
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            body: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.subscriptionAllotmentSchema, { target: 'openApi3' }),
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
    }, async (req, reply) => {
        const user = req.user;
        const { amount, planId, coupon_code } = (0, validations_1.validateData)(validations_1.subscriptionAllotmentSchema, req.body ?? {});
        const result = await service.createPaymentOrder(user.id, amount, planId, coupon_code);
        return reply.send(result);
    });
    app.post("/payments/confirm-payment", {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('CONFIRM_PAYMENT')],
        schema: {
            description: "Confirm Razorpay payment",
            tags: ["Payments"],
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            body: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.subscriptionConfirmPaymentSchema, { target: 'openApi3' }),
        }
    }, async (req, reply) => {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = (0, validations_1.validateData)(validations_1.subscriptionConfirmPaymentSchema, req.body ?? {});
        const result = await service.confirmPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, req);
        return reply.send(result);
    });
}
//# sourceMappingURL=SubscriptionSale.js.map