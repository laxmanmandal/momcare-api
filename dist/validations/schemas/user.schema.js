"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userUpdateBodySchema = exports.userStatusParamsSchema = exports.usersByEntityParamsSchema = exports.usersListByRoleParamsSchema = exports.usersListQuerySchema = exports.usersListParamsSchema = void 0;
const zod_1 = require("zod");
const startsWithLetterPattern = /^\p{L}/u;
const startsWithLetterMsg = 'must start with a letter';
exports.usersListParamsSchema = zod_1.z.object({
    entityId: zod_1.z.preprocess((val) => {
        if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
            return undefined;
        }
        const num = Number(val);
        return isNaN(num) ? val : num;
    }, zod_1.z.number({
        required_error: "is required",
        invalid_type_error: "must be a number",
    }).int().positive())
}).strict();
exports.usersListQuerySchema = zod_1.z.object({
    page: zod_1.z.preprocess((val) => {
        if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
            return undefined;
        }
        const num = Number(val);
        return isNaN(num) ? val : num;
    }, zod_1.z.number().int().positive().optional()),
    limit: zod_1.z.preprocess((val) => {
        if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
            return undefined;
        }
        const num = Number(val);
        return isNaN(num) ? val : num;
    }, zod_1.z.number().int().positive().max(100).optional()),
    search: zod_1.z.string().trim().optional(),
    role: zod_1.z.string().trim().optional(),
    type: zod_1.z.string().trim().optional(),
    isActive: zod_1.z.union([zod_1.z.boolean(), zod_1.z.enum(['true', 'false'])]).optional(),
    sortField: zod_1.z.string().trim().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional()
}).strict();
exports.usersListByRoleParamsSchema = zod_1.z.object({
    entityId: zod_1.z.preprocess((val) => {
        if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
            return undefined;
        }
        const num = Number(val);
        return isNaN(num) ? val : num;
    }, zod_1.z.number({
        required_error: "is required",
        invalid_type_error: "must be a number",
    }).int().positive()),
    role: zod_1.z.string().trim().min(1)
}).strict();
exports.usersByEntityParamsSchema = zod_1.z.object({
    entityId: zod_1.z.preprocess((val) => {
        if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
            return undefined;
        }
        const num = Number(val);
        return isNaN(num) ? val : num;
    }, zod_1.z.number({
        required_error: "is required",
        invalid_type_error: "must be a number",
    }).int().positive())
}).strict();
exports.userStatusParamsSchema = zod_1.z.object({
    uuid: zod_1.z.string().trim().min(1)
}).strict();
exports.userUpdateBodySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120).regex(startsWithLetterPattern, startsWithLetterMsg).optional(),
    email: zod_1.z.union([zod_1.z.string().trim().pipe(zod_1.z.email({ error: 'email must be a valid email address' })), zod_1.z.literal(''), zod_1.z.null()]).optional(),
    phone: zod_1.z.string().trim().min(10).max(20).optional(),
    child_gender: zod_1.z.string().trim().optional(),
    location: zod_1.z.string().trim().optional(),
    type: zod_1.z.string().trim().optional(),
    expectedDate: zod_1.z.string().trim().optional(),
    dob: zod_1.z.string().trim().optional(),
    dom: zod_1.z.string().trim().optional(),
    imageUrl: zod_1.z.string().trim().optional()
}).strict();
//# sourceMappingURL=user.schema.js.map