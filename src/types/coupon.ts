export interface CouponValidationResult {
    isValid: boolean;
    message: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    originalAmount?: number;
    discountAmount?: number;
    finalAmount?: number;
    couponDetails?: {
        code: string;
        percent?: number;
        fixed_amount?: number;
        is_used: boolean;
        effective_at: Date;
        expires_at: Date;
        active: boolean;
    };
}

export interface PriceCalculationInput {
    subtotal: number;
    couponCode?: string;
    items?: Array<{
        planId?: number;
        quantity: number;
        price: number;
    }>;
    userId?: number; // Optional: For user-specific coupons
}
