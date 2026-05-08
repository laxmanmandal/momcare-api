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
function inferEmptyPropertySchema(name) {
    if (/id$/i.test(name)) {
        return { type: 'string', pattern: '^[0-9]+$' };
    }
    if (/(date|time|dob|sleepStart|sleepEnd|From|To)$/i.test(name)) {
        return { type: 'string', format: 'date-time' };
    }
    return undefined;
}
function applyNamedEmptyPropertyFallbacks(schema) {
    if (!schema || typeof schema !== 'object')
        return schema;
    if (schema.properties && typeof schema.properties === 'object') {
        for (const [name, property] of Object.entries(schema.properties)) {
            if (!property || typeof property !== 'object')
                continue;
            if (Object.keys(property).length === 0) {
                const fallback = inferEmptyPropertySchema(name);
                if (fallback) {
                    schema.properties[name] = fallback;
                }
                continue;
            }
            applyNamedEmptyPropertyFallbacks(property);
        }
    }
    return schema;
}
function getObjectShape(schema) {
    if (!isZodSchema(schema))
        return undefined;
    const definition = schema._zod?.def;
    const shape = definition?.shape;
    return shape && typeof shape === 'object' ? shape : undefined;
}
function syncRequiredProperties(schema, jsonSchema) {
    const shape = getObjectShape(schema);
    if (!shape || !jsonSchema || typeof jsonSchema !== 'object')
        return jsonSchema;
    const required = Object.entries(shape)
        .filter(([, value]) => typeof value?.isOptional !== 'function' || !value.isOptional())
        .map(([key]) => key);
    if (required.length) {
        jsonSchema.required = required;
    }
    else {
        delete jsonSchema.required;
    }
    return jsonSchema;
}
function zodToJsonSchema(schema, _options) {
    if (!isZodSchema(schema)) {
        return stripSchemaMeta({ ...(schema ?? {}) });
    }
    const jsonSchema = applyNamedEmptyPropertyFallbacks(stripSchemaMeta(zod_1.z.toJSONSchema(schema, {
        io: 'input',
        target: 'draft-7',
        unrepresentable: 'any',
    })));
    syncRequiredProperties(schema, jsonSchema);
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