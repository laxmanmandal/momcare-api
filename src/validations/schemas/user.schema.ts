import { z } from 'zod';

export const usersListParamsSchema = z.object({
  entityId: z.coerce.number().int().positive()
}).strict();

export const usersListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  role: z.string().trim().optional(),
  type: z.string().trim().optional(),
  isActive: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
  sortField: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
}).strict();

export const usersListByRoleParamsSchema = z.object({
  entityId: z.coerce.number().int().positive(),
  role: z.string().trim().min(1)
}).strict();

export const usersByEntityParamsSchema = z.object({
  entityId: z.coerce.number().int().positive()
}).strict();

export const userStatusParamsSchema = z.object({
  uuid: z.string().trim().min(1)
}).strict();

export const userUpdateBodySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.union([z.string().trim().email('email must be a valid email address'), z.literal(''), z.null()]).optional(),
  phone: z.string().trim().min(10).max(20).optional(),
  child_gender: z.string().trim().optional(),
  location: z.string().trim().optional(),
  type: z.string().trim().optional(),
  expectedDate: z.string().trim().optional(),
  dob: z.string().trim().optional(),
  dom: z.string().trim().optional()
}).strict();

export type UsersListParams = z.infer<typeof usersListParamsSchema>;
export type UsersListQuery = z.infer<typeof usersListQuerySchema>;
export type UsersListByRoleParams = z.infer<typeof usersListByRoleParamsSchema>;
export type UsersByEntityParams = z.infer<typeof usersByEntityParamsSchema>;
export type UserStatusParams = z.infer<typeof userStatusParamsSchema>;
export type UserUpdateBody = z.infer<typeof userUpdateBodySchema>;
