"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAllowedKeys = assertAllowedKeys;
exports.assertAllowedFileFields = assertAllowedFileFields;
exports.readString = readString;
exports.readNumber = readNumber;
exports.readNullableNumber = readNullableNumber;
exports.readDateValue = readDateValue;
exports.readEnumString = readEnumString;
exports.readAssetReference = readAssetReference;
exports.readIdParam = readIdParam;
exports.assertAtLeastOneDefined = assertAtLeastOneDefined;
exports.pickDefined = pickDefined;
const http_errors_1 = __importDefault(require("http-errors"));
const httpUrlPattern = /^https?:\/\/[^\s]+$/i;
const localAssetPattern = /^\/[A-Za-z0-9/_-]+(?:\.[A-Za-z0-9]+)?$/;
function fail(message) {
    throw (0, http_errors_1.default)(400, message);
}
function assertAllowedKeys(input, allowed, subject = 'fields') {
    const unexpected = Object.keys(input).filter((key) => !allowed.includes(key));
    if (unexpected.length > 0) {
        fail(`Unexpected ${subject}: ${unexpected.join(', ')}`);
    }
}
function assertAllowedFileFields(files, allowed, maxFilesPerField = 1) {
    const unexpected = Object.keys(files).filter((key) => !allowed.includes(key));
    if (unexpected.length > 0) {
        fail(`Unexpected file fields: ${unexpected.join(', ')}`);
    }
    for (const [field, values] of Object.entries(files)) {
        if (values.length > maxFilesPerField) {
            fail(`${field} accepts at most ${maxFilesPerField} file(s)`);
        }
    }
}
function readString(input, field, options = {}) {
    const rawValue = input[field];
    if (rawValue === undefined || rawValue === null) {
        if (options.required)
            fail(`${field} is required`);
        return undefined;
    }
    if (typeof rawValue !== 'string') {
        fail(`${field} must be a string`);
    }
    const value = options.trim === false ? rawValue : rawValue.trim();
    if (value.length === 0) {
        if (options.required)
            fail(`${field} is required`);
        return undefined;
    }
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
function readNumber(input, field, options = {}) {
    const rawValue = input[field];
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        if (options.required)
            fail(`${field} is required`);
        return undefined;
    }
    const parsed = typeof rawValue === 'number'
        ? rawValue
        : typeof rawValue === 'string'
            ? Number(rawValue.trim())
            : Number.NaN;
    if (!Number.isFinite(parsed)) {
        fail(`${field} must be a valid number`);
    }
    if (options.integer && !Number.isInteger(parsed)) {
        fail(`${field} must be an integer`);
    }
    if (options.min !== undefined && parsed < options.min) {
        fail(`${field} must be greater than or equal to ${options.min}`);
    }
    if (options.max !== undefined && parsed > options.max) {
        fail(`${field} must be less than or equal to ${options.max}`);
    }
    return parsed;
}
function readNullableNumber(input, field, options = {}) {
    const rawValue = input[field];
    if (rawValue === undefined) {
        return undefined;
    }
    if (rawValue === null) {
        return null;
    }
    if (typeof rawValue === 'string') {
        const trimmed = rawValue.trim();
        if (trimmed === '' || trimmed.toLowerCase() === 'null') {
            return null;
        }
    }
    return readNumber(input, field, options);
}
function readDateValue(input, field, required = false) {
    const value = readString(input, field, { required });
    if (!value)
        return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        fail(`${field} must be a valid date`);
    }
    return date;
}
function readEnumString(input, field, allowedValues, required = false) {
    const value = readString(input, field, { required, maxLength: 50 });
    if (!value)
        return undefined;
    if (!allowedValues.includes(value)) {
        fail(`${field} must be one of: ${allowedValues.join(', ')}`);
    }
    return value;
}
function readAssetReference(input, field) {
    const value = readString(input, field, { maxLength: 2048 });
    if (!value)
        return undefined;
    if (!httpUrlPattern.test(value) && !localAssetPattern.test(value)) {
        fail(`${field} must be a valid URL or local asset path`);
    }
    return value;
}
function readIdParam(value, field = 'id') {
    const parsed = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? Number(value.trim())
            : Number.NaN;
    if (!Number.isInteger(parsed) || parsed < 1) {
        fail(`${field} must be a positive integer`);
    }
    return parsed;
}
function assertAtLeastOneDefined(values, message) {
    const hasValue = values.some(([, value]) => value !== undefined);
    if (!hasValue) {
        fail(message ?? `At least one of these fields is required: ${values.map(([key]) => key).join(', ')}`);
    }
}
function pickDefined(input) {
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
//# sourceMappingURL=requestValidation.js.map