"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZOD_DOCS_ONLY = void 0;
exports.isZodSchema = isZodSchema;
exports.zodToJsonSchema = zodToJsonSchema;
exports.normalizeJsonSchema = normalizeJsonSchema;
exports.buildMultipartBodySchema = buildMultipartBodySchema;
const zod_1 = require("zod");
exports.ZOD_DOCS_ONLY = Symbol.for('momcare.zod.docsOnly');
function isZodSchema(schema) {
    return Boolean(schema &&
        typeof schema === 'object' &&
        typeof schema.safeParse === 'function' &&
        schema._zod);
}
function stripSchemaMeta(schema) {
    if (schema && typeof schema === 'object') {
        delete schema.$schema;
    }
    return schema;
}
function zodToJsonSchema(schema, _options) {
    if (!isZodSchema(schema)) {
        return stripSchemaMeta({ ...(schema ?? {}) });
    }
    const jsonSchema = stripSchemaMeta(zod_1.z.toJSONSchema(schema, {
        io: 'input',
        target: 'draft-7',
        unrepresentable: 'any',
    }));
    Object.defineProperty(jsonSchema, exports.ZOD_DOCS_ONLY, {
        value: true,
        enumerable: false,
    });
    return jsonSchema;
}
function normalizeJsonSchema(schema) {
    if (!schema)
        return undefined;
    return isZodSchema(schema) ? zodToJsonSchema(schema) : stripSchemaMeta({ ...schema });
}
function buildMultipartBodySchema(schema) {
    const body = normalizeJsonSchema(schema);
    if (!body || typeof body !== 'object')
        return undefined;
    const props = body.properties ?? {};
    const fields = props.fields;
    const files = props.files;
    if (!fields || !files) {
        if (!body.type && body.properties)
            body.type = 'object';
        return body;
    }
    const flattenedProps = {};
    const required = new Set();
    for (const key of Object.keys(fields.properties ?? {})) {
        flattenedProps[key] = fields.properties[key];
    }
    for (const key of fields.required ?? []) {
        required.add(key);
    }
    for (const key of Object.keys(files.properties ?? {})) {
        flattenedProps[key] = {
            type: 'string',
            format: 'binary',
            description: files.properties[key]?.description,
        };
    }
    for (const key of files.required ?? []) {
        required.add(key);
    }
    return {
        type: 'object',
        properties: flattenedProps,
        required: required.size ? Array.from(required) : undefined,
    };
}
//# sourceMappingURL=zodOpenApi.js.map