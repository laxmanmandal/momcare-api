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
exports.default = CouponRoute;
const client_1 = require("@prisma/client");
const couponService = __importStar(require("../services/couponService"));
const auth_1 = require("../middleware/auth");
const validations_1 = require("../validations");
const zodFormData_1 = require("../utils/zodFormData");
const zod_to_json_schema_1 = require("zod-to-json-schema");
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
async function CouponRoute(app) {
    app.post('/create', {
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg],
        schema: {
            tags: ['Coupon'],
            consumes: ['multipart/form-data'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.couponCreateMultipartSchema),
            summary: 'Create a coupon',
            response: { 201: successObjectResponse }
        }
    }, async (req, reply) => {
        const { fields, files } = (0, validations_1.validateData)(validations_1.couponCreateMultipartSchema, await app.parseMultipartMemory(req));
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
    });
    app.post('/process', {
        preHandler: [auth_1.authMiddleware],
        schema: {
            tags: ['Coupon'],
            summary: 'Validate coupon and calculate final price',
            body: (0, zod_to_json_schema_1.zodToJsonSchema)(validations_1.couponProcessSchema, 'couponProcessBody'),
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
    }, async (req, reply) => {
        const { couponCode, planId } = (0, validations_1.validateData)(validations_1.couponProcessSchema, req.body ?? {});
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
        }
    }, async (_req, reply) => {
        const coupons = await couponService.getCoupons();
        reply.code(200).send({
            success: true,
            message: 'coupons fetched successfully',
            data: coupons
        });
    });
    app.get('/:coupon_code', {
        schema: {
            tags: ['Coupon'],
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { coupon_code } = (0, validations_1.validateData)(validations_1.couponCodeParamsSchema, req.params);
        const coupon = await couponService.getCouponByCode(coupon_code);
        reply.code(200).send({
            success: true,
            message: 'Coupon fetched successfully',
            data: coupon
        });
    });
    app.patch('/:id', {
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg],
        schema: {
            tags: ['Coupon'],
            consumes: ['multipart/form-data', 'application/json'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.couponUpdateMultipartSchema),
            summary: 'Update a coupon',
            response: { 200: successObjectResponse }
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.couponIdParamsSchema, req.params);
        const { fields, files } = (0, validations_1.validateData)(validations_1.couponUpdateMultipartSchema, await app.parseMultipartMemory(req));
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
    });
    app.patch('/:id/status', {
        schema: {
            tags: ['Coupon'],
            summary: 'Toggle coupon status',
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.couponIdParamsSchema, req.params);
        const coupon = await couponService.CouponStatus(Number(id), reply);
        return reply.send({ success: true, message: 'Coupon status updated successfully', data: coupon });
    });
    app.delete('/delete/:id', {
        schema: {
            tags: ['Coupon'],
            summary: 'Delete a coupon',
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.couponIdParamsSchema, req.params);
        await couponService.deleteCoupon(Number(id));
        return reply.send({ success: true, message: 'Coupon deleted successfully' });
    });
}
//# sourceMappingURL=coupon.js.map