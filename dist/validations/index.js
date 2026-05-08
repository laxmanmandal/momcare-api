"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.validateData = exports.ValidationError = void 0;
exports.zodToSwagger = zodToSwagger;
const zod_1 = require("zod");
const zodOpenApi_1 = require("../utils/zodOpenApi");
// Stub .openapi to prevent crashes if it was chained in schema definitions
if (typeof zod_1.z.ZodType.prototype.openapi === 'undefined') {
    zod_1.z.ZodType.prototype.openapi = function () { return this; };
}
function zodToSwagger(schema) {
    const jsonSchema = (0, zodOpenApi_1.zodToJsonSchema)(schema, { target: 'openApi3' });
    const result = {
        type: 'object',
        ...jsonSchema,
    };
    if (result.$schema)
        delete result.$schema;
    if (result.properties) {
        for (const [key, value] of Object.entries(result.properties)) {
            const val = value;
            const isEmpty = Object.keys(val).length === 0;
            const isKnownFile = ['icon', 'image', 'thumbnail', 'media', 'file', 'url'].includes(key);
            if (isKnownFile) {
                result.properties[key] = { type: 'string', format: 'binary' };
            }
            else if (isEmpty) {
                result.properties[key] = { type: 'string' };
            }
        }
    }
    // Bypass Fastify AJV validation so multipart streams can be 
    // successfully parsed and validated inside the route handler
    result[zodOpenApi_1.ZOD_DOCS_ONLY] = true;
    return result;
}
var error_1 = require("./error");
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return error_1.ValidationError; } });
var validate_1 = require("./validate");
Object.defineProperty(exports, "validateData", { enumerable: true, get: function () { return validate_1.validateData; } });
Object.defineProperty(exports, "validateRequest", { enumerable: true, get: function () { return validate_1.validateRequest; } });
__exportStar(require("./schemas"), exports);
//# sourceMappingURL=index.js.map