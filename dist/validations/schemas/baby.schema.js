"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedLogUpdateSchema = exports.feedLogCreateSchema = exports.sleepLogUpdateSchema = exports.sleepLogCreateSchema = exports.nutritionLogUpdateSchema = exports.nutritionLogCreateSchema = exports.motorSkillLogUpdateSchema = exports.motorSkillLogCreateSchema = exports.vaccinationLogUpdateSchema = exports.vaccinationLogCreateSchema = exports.babyProfileUpdateSchema = exports.babyProfileCreateSchema = exports.babyFeedListQuerySchema = exports.babySleepListQuerySchema = exports.babyNutritionListQuerySchema = exports.babyMotorSkillListQuerySchema = exports.babyVaccinationListQuerySchema = exports.babyProfileByUserListQuerySchema = exports.babyProfileListQuerySchema = exports.babyLogBabyIdParamsSchema = exports.babyLogIdParamsSchema = exports.babyProfileUserIdParamsSchema = exports.babyIdParamsSchema = exports.babyPositiveIntSchema = exports.babyBigIntIdSchema = void 0;
const zod_1 = require("zod");
const startsWithLetterPattern = /^\p{L}/u;
const startsWithLetterMsg = "must start with a letter";
exports.babyBigIntIdSchema = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
        return undefined;
    }
    try {
        return BigInt(val);
    }
    catch {
        return val;
    }
}, zod_1.z.bigint({
    required_error: "is required",
    invalid_type_error: "must be a valid ID",
}).positive());
exports.babyPositiveIntSchema = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
        return undefined;
    }
    const num = Number(val);
    return isNaN(num) ? val : num;
}, zod_1.z.number({
    required_error: "is required",
    invalid_type_error: "must be a number",
}).int().positive());
function requiredTrimmedString(minLength = 1, maxLength, pattern, message) {
    let schema = zod_1.z.string({ required_error: "is required", invalid_type_error: "is required" }).trim().min(minLength, "is required");
    if (maxLength !== undefined) {
        schema = schema.max(maxLength);
    }
    if (pattern) {
        schema = schema.regex(pattern, message);
    }
    return schema;
}
function optionalTrimmedString(maxLength, pattern, message) {
    let schema = zod_1.z.string().trim();
    if (maxLength !== undefined) {
        schema = schema.max(maxLength);
    }
    if (pattern) {
        schema = schema.regex(pattern, message);
    }
    return zod_1.z.preprocess((value) => {
        if (value === undefined || value === null)
            return undefined;
        if (typeof value === "string" && value.trim() === "")
            return undefined;
        return value;
    }, schema.optional());
}
function requiredDate() {
    return zod_1.z.preprocess((value) => {
        if (typeof value === "string" && value.trim() === "")
            return value;
        return value;
    }, zod_1.z.coerce.date());
}
function optionalDate() {
    return zod_1.z.preprocess((value) => {
        if (value === undefined || value === null)
            return undefined;
        if (typeof value === "string" && value.trim() === "")
            return undefined;
        return value;
    }, zod_1.z.coerce.date().optional());
}
function optionalNumber(options = {}) {
    let schema = zod_1.z.coerce.number();
    if (options.integer) {
        schema = schema.int();
    }
    if (options.min !== undefined) {
        schema = schema.min(options.min);
    }
    if (options.max !== undefined) {
        schema = schema.max(options.max);
    }
    return zod_1.z.preprocess((value) => {
        if (value === undefined || value === null)
            return undefined;
        if (typeof value === "string" && value.trim() === "")
            return undefined;
        return value;
    }, schema.optional());
}
function optionalBoolean() {
    return zod_1.z.preprocess((value) => {
        if (value === undefined || value === null)
            return undefined;
        if (typeof value === "boolean")
            return value;
        if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (!normalized)
                return undefined;
            if (["true", "1", "yes"].includes(normalized))
                return true;
            if (["false", "0", "no"].includes(normalized))
                return false;
        }
        return value;
    }, zod_1.z.boolean().optional());
}
function optionalBigInt() {
    return zod_1.z.preprocess((value) => {
        if (value === undefined || value === null)
            return undefined;
        if (typeof value === "string" && value.trim() === "")
            return undefined;
        return value;
    }, zod_1.z.coerce.bigint().positive().optional());
}
function hasMeaningfulValue(value) {
    return Object.values(value).some((entry) => entry !== undefined);
}
exports.babyIdParamsSchema = zod_1.z
    .object({
    id: exports.babyBigIntIdSchema,
})
    .strict();
exports.babyProfileUserIdParamsSchema = zod_1.z
    .object({
    userId: exports.babyPositiveIntSchema,
})
    .strict();
exports.babyLogIdParamsSchema = exports.babyIdParamsSchema;
exports.babyLogBabyIdParamsSchema = zod_1.z
    .object({
    babyId: exports.babyBigIntIdSchema,
})
    .strict();
function babyListQuerySchema(sortFields) {
    return zod_1.z
        .object({
        page: zod_1.z.coerce.number().int().positive().default(1),
        limit: zod_1.z.coerce.number().int().positive().max(100).default(10),
        search: optionalTrimmedString(255),
        sortField: zod_1.z.enum(sortFields).optional(),
        sortOrder: zod_1.z.enum(["asc", "desc"]).optional(),
    })
        .strict();
}
exports.babyProfileListQuerySchema = babyListQuerySchema([
    "id",
    "userId",
    "babyName",
    "gender",
    "dob",
    "bloodGroup",
    "birthWeight",
    "birthHeight",
    "createdAt",
    "updatedAt",
]);
exports.babyProfileByUserListQuerySchema = babyListQuerySchema([
    "id",
    "babyName",
    "gender",
    "dob",
    "bloodGroup",
    "birthWeight",
    "birthHeight",
    "createdAt",
    "updatedAt",
]);
exports.babyVaccinationListQuerySchema = babyListQuerySchema([
    "id",
    "babyId",
    "week",
    "doseNumber",
    "takenDate",
    "status",
    "createdAt",
]);
exports.babyMotorSkillListQuerySchema = babyListQuerySchema([
    "id",
    "babyId",
    "week",
    "status",
    "achievedDate",
    "skillNo",
    "createdAt",
]);
exports.babyNutritionListQuerySchema = babyListQuerySchema([
    "id",
    "babyId",
    "week",
    "mealType",
    "nutritionNo",
    "createdAt",
]);
exports.babySleepListQuerySchema = babyListQuerySchema([
    "id",
    "babyId",
    "week",
    "sleepStart",
    "sleepEnd",
    "durationMinutes",
    "notes",
    "createdAt",
]);
exports.babyFeedListQuerySchema = babyListQuerySchema([
    "id",
    "babyId",
    "feedType",
    "quantity",
    "feedingTime",
    "durationMinutes",
    "createdAt",
]);
exports.babyProfileCreateSchema = zod_1.z
    .object({
    userId: exports.babyPositiveIntSchema.optional(),
    babyName: requiredTrimmedString(1, 150, startsWithLetterPattern, startsWithLetterMsg),
    gender: optionalTrimmedString(20, startsWithLetterPattern, startsWithLetterMsg),
    dob: requiredDate(),
    bloodGroup: optionalTrimmedString(10),
    birthWeight: optionalNumber({ min: 0, max: 999.99 }),
    birthHeight: optionalNumber({ min: 0, max: 999.99 }),
})
    .strict();
exports.babyProfileUpdateSchema = exports.babyProfileCreateSchema
    .partial()
    .refine(hasMeaningfulValue, "At least one field is required");
exports.vaccinationLogCreateSchema = zod_1.z
    .object({
    babyId: optionalBigInt(),
    week: requiredTrimmedString(1, 50),
    doseNumber: optionalNumber({ min: 1, integer: true }),
    takenDate: optionalDate(),
    status: optionalBoolean(),
})
    .strict();
exports.vaccinationLogUpdateSchema = exports.vaccinationLogCreateSchema
    .partial()
    .refine(hasMeaningfulValue, "At least one field is required");
exports.motorSkillLogCreateSchema = zod_1.z
    .object({
    babyId: optionalBigInt(),
    week: requiredTrimmedString(1, 50),
    status: optionalBoolean(),
    achievedDate: optionalDate(),
    skillNo: optionalNumber({ min: 1, integer: true }),
})
    .strict();
exports.motorSkillLogUpdateSchema = exports.motorSkillLogCreateSchema
    .partial()
    .refine(hasMeaningfulValue, "At least one field is required");
exports.nutritionLogCreateSchema = zod_1.z
    .object({
    babyId: optionalBigInt(),
    week: requiredTrimmedString(1, 50),
    mealType: requiredTrimmedString(1, 100),
    nutritionNo: optionalNumber({ min: 1, integer: true }),
})
    .strict();
exports.nutritionLogUpdateSchema = exports.nutritionLogCreateSchema
    .partial()
    .refine(hasMeaningfulValue, "At least one field is required");
exports.sleepLogCreateSchema = zod_1.z
    .object({
    babyId: optionalBigInt(),
    week: requiredTrimmedString(1, 50),
    sleepStart: requiredDate(),
    sleepEnd: optionalDate(),
    durationMinutes: optionalNumber({ min: 0, integer: true }),
    notes: optionalTrimmedString(5000),
})
    .strict();
exports.sleepLogUpdateSchema = exports.sleepLogCreateSchema
    .partial()
    .refine(hasMeaningfulValue, "At least one field is required");
const feedTypeSchema = zod_1.z.enum(["BREAST_MILK", "FORMULA_MILK", "SOLID_FOOD", "WATER"]);
exports.feedLogCreateSchema = zod_1.z
    .object({
    babyId: optionalBigInt(),
    feedType: feedTypeSchema,
    quantity: optionalTrimmedString(100),
    feedingTime: requiredDate(),
    durationMinutes: optionalNumber({ min: 0, integer: true }),
    notes: optionalTrimmedString(5000),
})
    .strict();
exports.feedLogUpdateSchema = exports.feedLogCreateSchema
    .partial()
    .refine(hasMeaningfulValue, "At least one field is required");
//# sourceMappingURL=baby.schema.js.map