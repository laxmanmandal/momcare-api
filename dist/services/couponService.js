"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoupons = getCoupons;
exports.getCouponByCode = getCouponByCode;
exports.createCoupon = createCoupon;
exports.updateCoupon = updateCoupon;
exports.deleteCoupon = deleteCoupon;
exports.CouponStatus = CouponStatus;
exports.calculateFinalPrice = calculateFinalPrice;
exports.validateCoupon = validateCoupon;
exports.getUserCoupons = getUserCoupons;
const client_1 = __importDefault(require("../prisma/client"));
const fileUploads_1 = require("../utils/fileUploads");
async function getCoupons() {
    return client_1.default.coupon.findMany({
        include: {
            assigned_user: { select: { id: true, name: true } },
        }
    });
}
async function getCouponByCode(coupon_code) {
    return await client_1.default.coupon.findUnique({
        where: { code: coupon_code },
        include: {
            assigned_user: { select: { id: true, name: true } },
        }
    });
}
async function createCoupon(data) {
    return client_1.default.coupon.create({ data });
}
async function updateCoupon(id, data) {
    const existing = await client_1.default.coupon.findUnique({ where: { id } });
    if (!existing)
        throw new Error('coupon not found');
    // Prevent updates if coupon is active
    // Handle image replacement
    if (data.image && existing.image && existing.image !== data.image) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.image);
    }
    return client_1.default.coupon.update({
        where: { id },
        data,
    });
}
async function deleteCoupon(id) {
    const existing = await client_1.default.coupon.findUnique({ where: { id } });
    if (!existing)
        throw {
            statusCode: 404,
            message: 'Coupon not found'
        };
    if (existing.image && existing.image && existing.image !== existing.image) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.image);
    }
    return client_1.default.coupon.delete({ where: { id } });
}
async function CouponStatus(id, reply) {
    const couponId = Number(id);
    const coupon = await client_1.default.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) {
        throw new Error("Coupon not found");
    }
    // Coupon is already active → cannot deactivate it
    if (coupon.active === true) {
        return reply.send({
            success: false,
            message: "Coupon is already active and cannot be disabled"
        });
    }
    // Activate the coupon
    const updatedCoupon = await client_1.default.coupon.update({
        where: { id: couponId },
        data: { active: true }
    });
    return {
        updated: true,
        coupon: updatedCoupon
    };
}
async function calculateFinalPrice(input) {
    try {
        const { couponCode, userId, planId } = input;
        /* 1️⃣ Fetch plan */
        const plan = await client_1.default.subscriptionPlan.findUnique({
            where: { id: planId }
        });
        if (!plan || !plan.isActive) {
            return {
                isValid: false,
                message: "Invalid or inactive subscription plan",
                planName: null,
                originalAmount: null,
                discountAmount: null,
                finalAmount: null,
                coupon: null
            };
        }
        const subtotal = Number(plan.price);
        const now = new Date();
        let coupon = null;
        const hasCouponCode = !!couponCode?.trim();
        /* 2️⃣ Try PROVIDED coupon */
        if (hasCouponCode) {
            coupon = await client_1.default.coupon.findFirst({
                where: {
                    code: couponCode.trim(),
                    active: true,
                    is_used: 0,
                    effective_at: { lte: now },
                    expires_at: { gte: now },
                    OR: [
                        { assigned_user_id: null },
                        { assigned_user_id: userId }
                    ]
                }
            });
            if (!coupon) {
                return {
                    isValid: false,
                    message: "Invalid or expired coupon",
                    planName: plan.name,
                    originalAmount: Number(subtotal.toFixed(2)),
                    discountAmount: 0,
                    finalAmount: Number(subtotal.toFixed(2)),
                    coupon: null
                };
            }
        }
        if (!coupon) {
            coupon = await client_1.default.coupon.findFirst({
                where: {
                    active: true,
                    effective_at: { lte: now },
                    expires_at: { gte: now },
                    assigned_user_id: null
                },
                orderBy: { created_at: "desc" }
            });
        }
        if (!coupon) {
            return {
                isValid: true,
                message: "No coupon applied",
                planName: plan.name,
                originalAmount: Number(subtotal.toFixed(2)),
                discountAmount: 0,
                finalAmount: Number(subtotal.toFixed(2)),
                coupon: null
            };
        }
        const percent = coupon.percent !== null ? Number(coupon.percent) : null;
        const fixedAmount = coupon.fixed_amount !== null ? Number(coupon.fixed_amount) : null;
        let discountAmount = 0;
        if (percent !== null) {
            discountAmount = (subtotal * percent) / 100;
            if (fixedAmount !== null && discountAmount > fixedAmount) {
                discountAmount = fixedAmount;
            }
        }
        else if (fixedAmount !== null) {
            discountAmount = Math.min(fixedAmount, subtotal);
        }
        const finalAmount = Math.max(0, subtotal - discountAmount);
        return {
            isValid: true,
            message: hasCouponCode
                ? "Coupon applied successfully"
                : "Universal coupon applied successfully",
            planName: plan.name,
            originalAmount: Number(subtotal.toFixed(2)),
            discountAmount: Number(discountAmount.toFixed(2)),
            finalAmount: Number(finalAmount.toFixed(2)),
            coupon: {
                code: coupon.code,
                percent,
                fixed_amount: fixedAmount,
                isGlobal: coupon.assigned_user_id === null
            }
        };
    }
    catch {
        return {
            isValid: false,
            message: "Error processing coupon",
            planName: null,
            originalAmount: null,
            discountAmount: null,
            finalAmount: null,
            coupon: null
        };
    }
}
/**
 * Validate coupon without calculating price (just validation)
 */
async function validateCoupon(couponCode, entityId) {
    try {
        let coupon = null;
        let isUniversalCoupon = false;
        // If a specific coupon code is provided, try to find it
        if (couponCode) {
            const now = new Date();
            coupon = await client_1.default.coupon.findUnique({
                where: {
                    code: couponCode,
                    effective_at: { lte: now },
                    expires_at: { gte: now },
                    is_used: 0,
                    active: true,
                    assigned_user_id: entityId
                }
            });
        }
        // If no specific coupon found or no code provided, look for universal coupon
        if (!coupon) {
            // Find universal coupon (no assigned user, active, not expired, not used)
            const now = new Date();
            coupon = await client_1.default.coupon.findFirst({
                where: {
                    active: true,
                    effective_at: { lte: now },
                    expires_at: { gte: now },
                    is_used: 0,
                    assigned_user_id: null
                },
                orderBy: [
                    { created_at: 'desc' }, // Get the latest universal coupon
                ]
            });
            if (coupon) {
                isUniversalCoupon = true;
            }
        }
        // If still no coupon found
        if (!coupon) {
            if (couponCode) {
                return {
                    isValid: false,
                    message: 'Invalid coupon code and no universal coupon available'
                };
            }
            else {
                return {
                    isValid: false,
                    message: 'No coupon available'
                };
            }
        }
        // Basic validation
        const now = new Date();
        let isValid = true;
        let message = isUniversalCoupon ? 'Universal coupon applied' : 'Coupon is valid';
        if (!coupon.active) {
            isValid = false;
            message = 'Coupon is not active';
        }
        else if (now < coupon.effective_at) {
            isValid = false;
            message = 'Coupon is not yet effective';
        }
        else if (now > coupon.expires_at) {
            isValid = false;
            message = 'Coupon has expired';
        }
        else if (coupon.is_used === 1) {
            isValid = false;
            message = 'Coupon has already been used';
        }
        else if (coupon.assigned_user_id && entityId && coupon.assigned_user_id !== entityId) {
            isValid = false;
            message = 'This coupon is not assigned to you';
        }
        // Check usage count for universal coupons too
        if (isValid && coupon.used_count > 0) {
            const usageCount = await client_1.default.planAllocation.count({
                where: {
                    coupon_code: coupon.code,
                    type: 'SELL'
                }
            });
            if (usageCount >= coupon.used_count) {
                isValid = false;
                message = 'Coupon usage limit reached';
            }
        }
        return {
            isValid,
            message,
            discountType: coupon.percent ? 'percentage' : 'fixed',
            discountValue: coupon.percent ? Number(coupon.percent) : Number(coupon.fixed_amount),
            couponDetails: {
                code: coupon.code,
                percent: coupon.percent ? Number(coupon.percent) : undefined,
                fixed_amount: coupon.fixed_amount ? Number(coupon.fixed_amount) : undefined,
                is_used: coupon.is_used === 1,
                effective_at: coupon.effective_at,
                expires_at: coupon.expires_at,
                active: coupon.active,
            }
        };
    }
    catch (error) {
        console.error('Error validating coupon:', error);
        return {
            isValid: false,
            message: 'Error validating coupon'
        };
    }
}
/**
 * Apply coupon to a transaction and mark as used
 */
/**
 * Get all valid coupons for a user
 */
async function getUserCoupons(entityId) {
    try {
        const now = new Date();
        const whereClause = {
            active: true,
            effective_at: { lte: now },
            expires_at: { gte: now },
            is_used: 0
        };
        // If entityId provided, include user-specific coupons
        if (entityId) {
            whereClause.OR = [
                { assigned_user_id: null }, // General coupons
                { assigned_user_id: entityId } // User-specific coupons
            ];
        }
        else {
            whereClause.assigned_user_id = null; // Only general coupons
        }
        const coupons = await client_1.default.coupon.findMany({
            where: whereClause,
            orderBy: { created_at: 'desc' }
        });
        return coupons.map(coupon => ({
            code: coupon.code,
            discountType: coupon.percent ? 'percentage' : 'fixed',
            discountValue: coupon.percent ? Number(coupon.percent) : Number(coupon.fixed_amount),
            description: `Get ${coupon.percent ? `${coupon.percent}%` : `₹${coupon.fixed_amount}`} off`,
            validUntil: coupon.expires_at,
            isAssigned: coupon.assigned_user_id !== null
        }));
    }
    catch (error) {
        console.error('Error getting user coupons:', error);
        return [];
    }
}
//# sourceMappingURL=couponService.js.map