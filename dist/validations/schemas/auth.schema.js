"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signupSchema = exports.changePasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.verifyOtpSchema = exports.requestOtpSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const phonePattern = /^[0-9+() -]{10,20}$/;
const otpPattern = /^[0-9]{4,8}$/;
exports.requestOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().trim().regex(phonePattern, 'phone must be a valid mobile number')
}).strict();
exports.verifyOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().trim().regex(phonePattern, 'phone must be a valid mobile number'),
    otp: zod_1.z.string().trim().regex(otpPattern, 'otp must be 4-8 numeric digits')
}).strict();
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email('email must be a valid email address'),
    password: zod_1.z.string().min(8).max(128)
}).strict();
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'refreshToken is required')
}).strict();
exports.changePasswordSchema = zod_1.z.object({
    userId: zod_1.z.coerce.number().int().positive('userId must be a positive integer'),
    old_password: zod_1.z.string().min(8).max(128),
    new_password: zod_1.z.string().min(8).max(128)
}).strict();
exports.signupSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120),
    type: zod_1.z.string().trim().max(50).optional(),
    location: zod_1.z.string().trim().min(2).max(255).optional(),
    email: zod_1.z.string().trim().email('email must be a valid email address').max(254).optional(),
    phone: zod_1.z.string().trim().regex(phonePattern, 'phone must be a valid mobile number'),
    password: zod_1.z.string().min(8).max(128).optional(),
    role: zod_1.z.nativeEnum(client_1.Role),
    belongsToId: zod_1.z.coerce.number().int().optional(),
    createdBy: zod_1.z.coerce.number().int().optional(),
    planId: zod_1.z.union([zod_1.z.coerce.number().int().positive(), zod_1.z.null()]).optional()
}).strict().superRefine((data, ctx) => {
    if (data.role === client_1.Role.USER)
        return;
    if (!data.email) {
        ctx.addIssue({
            code: 'custom',
            path: ['email'],
            message: 'email is required for this role'
        });
    }
    if (!data.password) {
        ctx.addIssue({
            code: 'custom',
            path: ['password'],
            message: 'password is required for this role'
        });
    }
});
//# sourceMappingURL=auth.schema.js.map