import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }).openapi({ example: 'admin@momcare.in' }),
  password: z.string().min(1, { message: 'Password is required' }).openapi({ example: 'SecurePass123' }),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

// You can infer the types directly from the schemas for use in your controllers
export type LoginInput = z.infer<typeof loginSchema>;
