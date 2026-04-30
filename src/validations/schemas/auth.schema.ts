import { Role } from '@prisma/client';
import { z } from 'zod';

const phonePattern = /^[0-9+() -]{10,20}$/;
const otpPattern = /^[0-9]{4,8}$/;

export const requestOtpSchema = z.object({
  phone: z.string().trim().regex(phonePattern, 'phone must be a valid mobile number')
}).strict();

export const verifyOtpSchema = z.object({
  phone: z.string().trim().regex(phonePattern, 'phone must be a valid mobile number'),
  otp: z.string().trim().regex(otpPattern, 'otp must be 4-8 numeric digits')
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email('email must be a valid email address'),
  password: z.string().min(8).max(128)
}).strict();

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required')
}).strict();

export const changePasswordSchema = z.object({
  userId: z.coerce.number().int().positive('userId must be a positive integer'),
  old_password: z.string().min(8).max(128),
  new_password: z.string().min(8).max(128)
}).strict();

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.string().trim().max(50).optional(),
  location: z.string().trim().min(2).max(255).optional(),
  email: z.string().trim().email('email must be a valid email address').max(254).optional(),
  phone: z.string().trim().regex(phonePattern, 'phone must be a valid mobile number'),
  password: z.string().min(8).max(128).optional(),
  role: z.nativeEnum(Role),
  belongsToId: z.coerce.number().int().optional(),
  createdBy: z.coerce.number().int().optional(),
  planId: z.union([z.coerce.number().int().positive(), z.null()]).optional()
}).strict().superRefine((data, ctx) => {
  if (data.role === Role.USER) return;

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

export type RequestOtpBody = z.infer<typeof requestOtpSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type RefreshTokenBody = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;
export type SignupBody = z.infer<typeof signupSchema>;
