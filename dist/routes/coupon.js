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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CouponRoute;
const couponService = __importStar(require("../services/couponService"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const http_errors_1 = __importDefault(require("http-errors"));
const requestValidation_1 = require("../utils/requestValidation");
const couponIdParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: {
        id: { type: 'integer', minimum: 1 }
    }
};
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
};
const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object' }
    }
};
const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object' } }
    }
};
async function CouponRoute(app) {
    function buildCouponPayload(fields, isCreate) {
        (0, requestValidation_1.assertAllowedKeys)(fields, [
            'code',
            'percent',
            'fixed_amount',
            'assigned_user_id',
            'effective_at',
            'expires_at'
        ]);
        const code = (0, requestValidation_1.readString)(fields, 'code', { required: isCreate, minLength: 3, maxLength: 50, pattern: /^[A-Za-z0-9_-]+$/ });
        const percent = (0, requestValidation_1.readNullableNumber)(fields, 'percent', { min: 0, max: 100 });
        const fixedAmount = (0, requestValidation_1.readNullableNumber)(fields, 'fixed_amount', { min: 0 });
        const assignedUserId = (0, requestValidation_1.readNullableNumber)(fields, 'assigned_user_id', { min: 1, integer: true });
        const effectiveAt = (0, requestValidation_1.readDateValue)(fields, 'effective_at', isCreate);
        const expiresAt = (0, requestValidation_1.readDateValue)(fields, 'expires_at', isCreate);
        if (isCreate) {
            if (percent === null && fixedAmount === null) {
                throw (0, http_errors_1.default)(400, 'Either percent or fixed_amount is required');
            }
            if (percent !== null && percent !== undefined && fixedAmount !== null && fixedAmount !== undefined) {
                throw (0, http_errors_1.default)(400, 'Percent and fixed_amount cannot both be provided');
            }
        }
        else if (percent !== undefined || fixedAmount !== undefined) {
            if (percent !== null && percent !== undefined && fixedAmount !== null && fixedAmount !== undefined) {
                throw (0, http_errors_1.default)(400, 'Percent and fixed_amount cannot both be provided');
            }
            if (percent === null && fixedAmount === null) {
                throw (0, http_errors_1.default)(400, 'At least one discount value must remain set');
            }
        }
        if (effectiveAt && expiresAt && effectiveAt > expiresAt) {
            throw (0, http_errors_1.default)(400, 'effective_at must be before or equal to expires_at');
        }
        return (0, requestValidation_1.pickDefined)({
            code,
            percent,
            fixed_amount: fixedAmount,
            assigned_user_id: assignedUserId,
            effective_at: effectiveAt,
            expires_at: expiresAt
        });
    }
    app.post('/create', {
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg],
        schema: {
            tags: ['Coupon'],
            consumes: ['multipart/form-data'],
            summary: 'Create a coupon',
            body: couponBodySchema,
            response: { 201: successObjectResponse }
        },
    }, async (req, reply) => {
        const { files, fields } = await app.parseMultipartMemory(req);
        (0, requestValidation_1.assertAllowedFileFields)(files, ['image']);
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
    });
    app.post("/process", {
        preHandler: [auth_1.authMiddleware],
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
    }, async (req, reply) => {
        const { couponCode, planId } = req.body;
        const user = req.user;
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
    });
    app.get('/available', {
        preHandler: [auth_1.authMiddleware],
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
    }, async (req, reply) => {
        const user = req.user;
        const userId = user.role === client_1.Role.USER ? user.id : user.belongsToId;
        const coupons = await couponService.getUserCoupons(userId);
        return reply.send({
            success: true,
            data: coupons
        });
    });
    app.get('/', {
        schema: {
            tags: ['Coupon'],
            summary: 'List coupons',
            response: { 200: successArrayResponse }
        },
    }, async (req, reply) => {
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
    }, async (req, reply) => {
        const { coupon_code } = req.params;
        const dailytips = await couponService.getCouponByCode(coupon_code);
        reply.code(200).send({
            success: true,
            message: 'Coupon fetched successfully',
            data: dailytips,
        });
    });
    app.patch('/:id', {
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg],
        schema: {
            tags: ['Coupon'],
            consumes: ['application/json', 'multipart/form-data'],
            summary: 'Update a coupon',
            params: couponIdParamsSchema,
            body: couponBodySchema,
            response: { 200: successObjectResponse }
        },
    }, async (req, reply) => {
        const { files, fields } = await app.parseMultipartMemory(req);
        const { id } = req.params;
        (0, requestValidation_1.assertAllowedFileFields)(files, ['image']);
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
    });
    app.patch('/:id/status', {
        schema: {
            tags: ['Coupon'],
            summary: 'Toggle coupon status',
            params: couponIdParamsSchema,
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = req.params;
        const coupon = await couponService.CouponStatus(Number(id), reply);
        return reply.send({ success: true, message: 'Coupon status updated successfully', data: coupon });
    });
    app.delete('/delete/:id', {
        schema: {
            tags: ['Coupon'],
            summary: 'Delete a coupon',
            params: couponIdParamsSchema,
            response: { 200: successObjectResponse }
        }, preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = req.params;
        await couponService.deleteCoupon(Number(id));
        return reply.send({ success: true, message: 'Coupon deleted successfully' });
    });
}
//# sourceMappingURL=coupon.js.map