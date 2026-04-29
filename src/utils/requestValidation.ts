import createHttpError from "http-errors";
import { z } from "zod";

type StringOptions = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  trim?: boolean;
};

type NumberOptions = {
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
};

const httpUrlPattern = /^https?:\/\/[^\s]+$/i;
const localAssetPattern = /^\/[A-Za-z0-9/_-]+(?:\.[A-Za-z0-9]+)?$/;

function fail(message: string): never {
  throw createHttpError(400, message);
}

export function assertAllowedKeys(
  input: Record<string, unknown>,
  allowed: readonly string[],
  subject = "fields",
): void {
  const result = z.record(z.unknown()).safeParse(input);
  if (!result.success) fail(`Invalid ${subject}`);

  const unexpected = Object.keys(result.data).filter((key) => !allowed.includes(key));
  if (unexpected.length) fail(`Unexpected ${subject}: ${unexpected.join(", ")}`);
}

export function assertAllowedFileFields(
  files: Record<string, unknown[]>,
  allowed: readonly string[],
  maxFilesPerField = 1,
): void {
  const result = z.record(z.array(z.unknown())).safeParse(files);
  if (!result.success) fail("Invalid file fields");

  const unexpected = Object.keys(result.data).filter((key) => !allowed.includes(key));
  if (unexpected.length) fail(`Unexpected file fields: ${unexpected.join(", ")}`);

  for (const [field, values] of Object.entries(result.data)) {
    if (values.length > maxFilesPerField) {
      fail(`${field} accepts at most ${maxFilesPerField} file(s)`);
    }
  }
}

export function readString(
  input: Record<string, unknown>,
  field: string,
  options: StringOptions = {},
): string | undefined {
  const rawValue = input[field];

  if (rawValue === undefined || rawValue === null) {
    if (options.required) fail(`${field} is required`);
    return undefined;
  }

  const parsed = z.string({ invalid_type_error: `${field} must be a string` }).safeParse(rawValue);
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? `${field} must be a string`);

  const value = options.trim === false ? parsed.data : parsed.data.trim().replace(/\s+/g, " ");

  if (!value.length) {
    if (options.required) fail(`${field} is required`);
    return undefined;
  }

  if (/<[^>]*>/.test(value)) fail(`${field} contains invalid characters`);
  if (/\s{2,}/.test(value)) fail(`${field} must not contain multiple spaces`);
  if (!options.pattern && !/^[A-Za-z]/.test(value)) fail(`${field} must start with a letter`);

  if (options.minLength !== undefined && value.length < options.minLength) {
    fail(`${field} must be at least ${options.minLength} characters`);
  }
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    fail(`${field} must be at most ${options.maxLength} characters`);
  }
  if (options.pattern && !options.pattern.test(value)) {
    fail(options.patternMessage ?? `${field} is invalid`);
  }

  return value;
}

export function readNumber(
  input: Record<string, unknown>,
  field: string,
  options: NumberOptions = {},
): number | undefined {
  const rawValue = input[field];

  if (rawValue === undefined || rawValue === null || rawValue === "") {
    if (options.required) fail(`${field} is required`);
    return undefined;
  }

  const parsed = z.coerce.number({ invalid_type_error: `${field} must be a valid number` }).safeParse(rawValue);
  if (!parsed.success || !Number.isFinite(parsed.data)) fail(`${field} must be a valid number`);

  const value = parsed.data;

  if (options.integer && !Number.isInteger(value)) fail(`${field} must be an integer`);
  if (options.min !== undefined && value < options.min) fail(`${field} must be greater than or equal to ${options.min}`);
  if (options.max !== undefined && value > options.max) fail(`${field} must be less than or equal to ${options.max}`);

  return value;
}

export function readNullableNumber(
  input: Record<string, unknown>,
  field: string,
  options: Omit<NumberOptions, "required"> = {},
): number | null | undefined {
  const rawValue = input[field];

  if (rawValue === undefined) return undefined;
  if (rawValue === null) return null;

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (trimmed === "" || trimmed.toLowerCase() === "null") return null;
  }

  return readNumber(input, field, options);
}

export function readDateValue(
  input: Record<string, unknown>,
  field: string,
  required = false,
): Date | undefined {
  const value = readString(input, field, { required });
  if (!value) return undefined;

  const parsed = z.coerce.date().safeParse(value);
  if (!parsed.success || Number.isNaN(parsed.data.getTime())) fail(`${field} must be a valid date`);

  return parsed.data;
}

export function readEnumString<const T extends readonly string[]>(
  input: Record<string, unknown>,
  field: string,
  allowedValues: T,
  required = false,
): T[number] | undefined {
  const value = readString(input, field, { required, maxLength: 50 });
  if (!value) return undefined;

  if (!allowedValues.includes(value)) {
    fail(`${field} must be one of: ${allowedValues.join(", ")}`);
  }

  return value as T[number];
}

export function readAssetReference(
  input: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = readString(input, field, { maxLength: 2048 });
  if (!value) return undefined;

  if (!httpUrlPattern.test(value) && !localAssetPattern.test(value)) {
    fail(`${field} must be a valid URL or local asset path`);
  }

  return value;
}

export function readIdParam(value: unknown, field = "id"): number {
  const parsed = z.coerce.number().int().positive().safeParse(value);
  if (!parsed.success) fail(`${field} must be a positive integer`);
  return parsed.data;
}

export function assertAtLeastOneDefined(
  values: Array<[string, unknown]>,
  message?: string,
): void {
  const hasValue = values.some(([, value]) => value !== undefined);

  if (!hasValue) {
    fail(
      message ??
        `At least one of these fields is required: ${values.map(([key]) => key).join(", ")}`,
    );
  }
}

export function pickDefined<T extends Record<string, unknown>>(
  input: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
