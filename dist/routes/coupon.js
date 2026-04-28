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
const couponService = __importStar(require("../services/couponService"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
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
};
async function CouponRoute(app) {
    function normalizeNumber(input) {
        if (input === null || input === undefined)
            return null;
        if (typeof input === 'string') {
            const trimmed = input.trim();
            if (trimmed === '' || trimmed.toLowerCase() === 'null')
                return null;
            const parsed = Number(trimmed);
            return Number.isFinite(parsed) ? parsed : null;
        }
        if (typeof input === 'number') {
            return Number.isFinite(input) ? input : null;
        }
        return null;
    }
    app.post('/create', {
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg],
        schema: {
            tags: ['Coupon'],
            consumes: ['multipart/form-data'],
            body: couponWriteBody
        },
    }, async (req, reply) => {
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
    });
    app.post("/process", {
        preHandler: [auth_1.authMiddleware],
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
        schema: { tags: ['Coupon'] },
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
            body: couponWriteBody
        },
    }, async (req, reply) => {
        const { files, fields } = await app.parseMultipartMemory(req);
        const { id } = req.params;
        if (!req.isMultipart() && req.body)
            Object.assign(fields, req.body);
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
    });
    app.patch('/:id/status', {
        schema: { tags: ['Coupon'] },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = req.params;
        const coupon = await couponService.CouponStatus(Number(id), reply);
        return reply.send({ success: true, message: 'Coupon status updated successfully', data: coupon });
    });
    app.delete('/delete/:id', { schema: { tags: ['Coupon'] }, preHandler: [auth_1.authMiddleware, auth_1.onlyOrg] }, async (req, reply) => {
        const { id } = req.params;
        await couponService.deleteCoupon(Number(id));
        return reply.send({ success: true, message: 'Coupon deleted successfully' });
    });
}
//# sourceMappingURL=coupon.js.map