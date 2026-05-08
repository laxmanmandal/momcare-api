import { z } from "zod";

const startsWithLetterPattern = /^\p{L}/u;
const startsWithLetterMsg = "must start with a letter";

export const babyBigIntIdSchema = z.coerce.bigint().positive();
export const babyPositiveIntSchema = z.coerce.number().int().positive();

function requiredTrimmedString(minLength = 1, maxLength?: number, pattern?: RegExp, message?: string) {
  let schema = z.string().trim().min(minLength);

  if (maxLength !== undefined) {
    schema = schema.max(maxLength);
  }

  if (pattern) {
    schema = schema.regex(pattern, message);
  }

  return schema;
}

function optionalTrimmedString(maxLength?: number, pattern?: RegExp, message?: string) {
  let schema = z.string().trim();

  if (maxLength !== undefined) {
    schema = schema.max(maxLength);
  }

  if (pattern) {
    schema = schema.regex(pattern, message);
  }

  return z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }, schema.optional());
}

function requiredDate() {
  return z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") return value;
    return value;
  }, z.coerce.date());
}

function optionalDate() {
  return z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }, z.coerce.date().optional());
}

function optionalNumber(options: { min?: number; max?: number; integer?: boolean } = {}) {
  let schema = z.coerce.number();

  if (options.integer) {
    schema = schema.int();
  }

  if (options.min !== undefined) {
    schema = schema.min(options.min);
  }

  if (options.max !== undefined) {
    schema = schema.max(options.max);
  }

  return z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }, schema.optional());
}

function optionalBoolean() {
  return z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return undefined;
      if (["true", "1", "yes"].includes(normalized)) return true;
      if (["false", "0", "no"].includes(normalized)) return false;
    }
    return value;
  }, z.boolean().optional());
}

function optionalBigInt() {
  return z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }, z.coerce.bigint().positive().optional());
}

function hasMeaningfulValue(value: Record<string, unknown>) {
  return Object.values(value).some((entry) => entry !== undefined);
}

export const babyIdParamsSchema = z
  .object({
    id: babyBigIntIdSchema,
  })
  .strict();

export const babyProfileUserIdParamsSchema = z
  .object({
    userId: babyPositiveIntSchema,
  })
  .strict();

export const babyLogIdParamsSchema = babyIdParamsSchema;

export const babyLogBabyIdParamsSchema = z
  .object({
    babyId: babyBigIntIdSchema,
  })
  .strict();

function babyListQuerySchema(sortFields: [string, ...string[]]) {
  return z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(10),
      search: optionalTrimmedString(255),
      sortField: z.enum(sortFields).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    })
    .strict();
}

export const babyProfileListQuerySchema = babyListQuerySchema([
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

export const babyProfileByUserListQuerySchema = babyListQuerySchema([
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

export const babyVaccinationListQuerySchema = babyListQuerySchema([
  "id",
  "babyId",
  "vaccineName",
  "doseNumber",
  "dueDate",
  "takenDate",
  "status",
  "createdAt",
]);

export const babyMotorSkillListQuerySchema = babyListQuerySchema([
  "id",
  "babyId",
  "title",
  "achieved",
  "achievedDate",
  "createdAt",
]);

export const babyNutritionListQuerySchema = babyListQuerySchema([
  "id",
  "babyId",
  "mealType",
  "foodName",
  "quantity",
  "feedingTime",
  "createdAt",
]);

export const babySleepListQuerySchema = babyListQuerySchema([
  "id",
  "babyId",
  "sleepStart",
  "sleepEnd",
  "durationMinutes",
  "sleepQuality",
  "createdAt",
]);

export const babyFeedListQuerySchema = babyListQuerySchema([
  "id",
  "babyId",
  "feedType",
  "quantity",
  "feedingTime",
  "durationMinutes",
  "createdAt",
]);

export const babyProfileCreateSchema = z
  .object({
    userId: babyPositiveIntSchema.optional(),
    babyName: requiredTrimmedString(1, 150, startsWithLetterPattern, startsWithLetterMsg),
    gender: optionalTrimmedString(20, startsWithLetterPattern, startsWithLetterMsg),
    dob: requiredDate(),
    bloodGroup: optionalTrimmedString(10),
    birthWeight: optionalNumber({ min: 0, max: 999.99 }),
    birthHeight: optionalNumber({ min: 0, max: 999.99 }),
  })
  .strict();

export const babyProfileUpdateSchema = babyProfileCreateSchema
  .partial()
  .refine(hasMeaningfulValue, "At least one field is required");

export const vaccinationLogCreateSchema = z
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

export const vaccinationLogUpdateSchema = vaccinationLogCreateSchema
  .partial()
  .refine(hasMeaningfulValue, "At least one field is required");

export const motorSkillLogCreateSchema = z
  .object({
    babyId: optionalBigInt(),
    title: requiredTrimmedString(1, 255),
    achieved: optionalBoolean(),
    achievedDate: optionalDate(),
    notes: optionalTrimmedString(5000),
  })
  .strict();

export const motorSkillLogUpdateSchema = motorSkillLogCreateSchema
  .partial()
  .refine(hasMeaningfulValue, "At least one field is required");

export const nutritionLogCreateSchema = z
  .object({
    babyId: optionalBigInt(),
    mealType: requiredTrimmedString(1, 100),
    foodName: requiredTrimmedString(1, 255),
    quantity: optionalTrimmedString(100),
    feedingTime: requiredDate(),
    notes: optionalTrimmedString(5000),
  })
  .strict();

export const nutritionLogUpdateSchema = nutritionLogCreateSchema
  .partial()
  .refine(hasMeaningfulValue, "At least one field is required");

export const sleepLogCreateSchema = z
  .object({
    babyId: optionalBigInt(),
    sleepStart: requiredDate(),
    sleepEnd: optionalDate(),
    durationMinutes: optionalNumber({ min: 0, integer: true }),
    sleepQuality: optionalTrimmedString(100),
    notes: optionalTrimmedString(5000),
  })
  .strict();

export const sleepLogUpdateSchema = sleepLogCreateSchema
  .partial()
  .refine(hasMeaningfulValue, "At least one field is required");

const feedTypeSchema = z.enum(["BREAST_MILK", "FORMULA_MILK", "SOLID_FOOD", "WATER"]);

export const feedLogCreateSchema = z
  .object({
    babyId: optionalBigInt(),
    feedType: feedTypeSchema,
    quantity: optionalTrimmedString(100),
    feedingTime: requiredDate(),
    durationMinutes: optionalNumber({ min: 0, integer: true }),
    notes: optionalTrimmedString(5000),
  })
  .strict();

export const feedLogUpdateSchema = feedLogCreateSchema
  .partial()
  .refine(hasMeaningfulValue, "At least one field is required");
