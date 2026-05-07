"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedLogUpdateSchema = exports.feedLogCreateSchema = exports.sleepLogUpdateSchema = exports.sleepLogCreateSchema = exports.nutritionLogUpdateSchema = exports.nutritionLogCreateSchema = exports.motorSkillLogUpdateSchema = exports.motorSkillLogCreateSchema = exports.vaccinationLogUpdateSchema = exports.vaccinationLogCreateSchema = exports.babyProfileUpdateSchema = exports.babyProfileCreateSchema = exports.babyLogBabyIdParamsSchema = exports.babyLogIdParamsSchema = exports.babyProfileUserIdParamsSchema = exports.babyIdParamsSchema = exports.babyPositiveIntSchema = exports.babyBigIntIdSchema = void 0;
const zod_1 = require("zod");
const startsWithLetterPattern = /^\p{L}/u;
const startsWithLetterMsg = "must start with a letter";
exports.babyBigIntIdSchema = zod_1.z.coerce.bigint().positive();
exports.babyPositiveIntSchema = zod_1.z.coerce.number().int().positive();
function requiredTrimmedString(minLength = 1, maxLength, pattern, message) {
    let schema = zod_1.z.string().trim().min(minLength);
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
    vaccineName: requiredTrimmedString(1, 255),
    doseNumber: optionalNumber({ min: 1, integer: true }),
    dueDate: optionalDate(),
    takenDate: optionalDate(),
    status: optionalTrimmedString(50),
    notes: optionalTrimmedString(5000),
})
    .strict();
exports.vaccinationLogUpdateSchema = exports.vaccinationLogCreateSchema
    .partial()
    .refine(hasMeaningfulValue, "At least one field is required");
exports.motorSkillLogCreateSchema = zod_1.z
    .object({
    babyId: optionalBigInt(),
    title: requiredTrimmedString(1, 255),
    achieved: optionalBoolean(),
    achievedDate: optionalDate(),
    notes: optionalTrimmedString(5000),
})
    .strict();
exports.motorSkillLogUpdateSchema = exports.motorSkillLogCreateSchema
    .partial()
    .refine(hasMeaningfulValue, "At least one field is required");
exports.nutritionLogCreateSchema = zod_1.z
    .object({
    babyId: optionalBigInt(),
    mealType: requiredTrimmedString(1, 100),
    foodName: requiredTrimmedString(1, 255),
    quantity: optionalTrimmedString(100),
    feedingTime: requiredDate(),
    notes: optionalTrimmedString(5000),
})
    .strict();
exports.nutritionLogUpdateSchema = exports.nutritionLogCreateSchema
    .partial()
    .refine(hasMeaningfulValue, "At least one field is required");
exports.sleepLogCreateSchema = zod_1.z
    .object({
    babyId: optionalBigInt(),
    sleepStart: requiredDate(),
    sleepEnd: optionalDate(),
    durationMinutes: optionalNumber({ min: 0, integer: true }),
    sleepQuality: optionalTrimmedString(100),
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