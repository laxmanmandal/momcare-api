import { z } from 'zod';

type JsonSchema = Record<string, any>;
export const ZOD_DOCS_ONLY = Symbol.for('momcare.zod.docsOnly');

export function isZodSchema(schema: unknown): schema is z.ZodTypeAny {
  return Boolean(
    schema &&
      typeof schema === 'object' &&
      typeof (schema as any).safeParse === 'function' &&
      (schema as any)._zod,
  );
}

function stripSchemaMeta(schema: JsonSchema): JsonSchema {
  if (schema && typeof schema === 'object') {
    delete schema.$schema;
  }

  return schema;
}

function inferEmptyPropertySchema(name: string): JsonSchema | undefined {
  if (/id$/i.test(name)) {
    return { type: 'string', pattern: '^[0-9]+$' };
  }

  if (/(date|time|dob|sleepStart|sleepEnd|From|To)$/i.test(name)) {
    return { type: 'string', format: 'date-time' };
  }

  return undefined;
}

function applyNamedEmptyPropertyFallbacks(schema: JsonSchema): JsonSchema {
  if (!schema || typeof schema !== 'object') return schema;

  if (schema.properties && typeof schema.properties === 'object') {
    for (const [name, property] of Object.entries(schema.properties)) {
      if (!property || typeof property !== 'object') continue;

      if (Object.keys(property as JsonSchema).length === 0) {
        const fallback = inferEmptyPropertySchema(name);
        if (fallback) {
          schema.properties[name] = fallback;
        }
        continue;
      }

      applyNamedEmptyPropertyFallbacks(property as JsonSchema);
    }
  }

  return schema;
}

function getObjectShape(schema: unknown): Record<string, any> | undefined {
  if (!isZodSchema(schema)) return undefined;

  const definition = (schema as any)._zod?.def;
  const shape = definition?.shape;

  return shape && typeof shape === 'object' ? shape : undefined;
}

function syncRequiredProperties(schema: unknown, jsonSchema: JsonSchema): JsonSchema {
  const shape = getObjectShape(schema);
  if (!shape || !jsonSchema || typeof jsonSchema !== 'object') return jsonSchema;

  const required = Object.entries(shape)
    .filter(([, value]) => typeof (value as any)?.isOptional !== 'function' || !(value as any).isOptional())
    .map(([key]) => key);

  if (required.length) {
    jsonSchema.required = required;
  } else {
    delete jsonSchema.required;
  }

  return jsonSchema;
}

export function zodToJsonSchema(schema: unknown, _options?: unknown): JsonSchema {
  if (!isZodSchema(schema)) {
    return stripSchemaMeta({ ...((schema as JsonSchema) ?? {}) });
  }

  const jsonSchema = applyNamedEmptyPropertyFallbacks(stripSchemaMeta(
    z.toJSONSchema(schema, {
      io: 'input',
      target: 'draft-7',
      unrepresentable: 'any',
    } as any) as JsonSchema,
  ));

  syncRequiredProperties(schema, jsonSchema);

  Object.defineProperty(jsonSchema, ZOD_DOCS_ONLY, {
    value: true,
    enumerable: false,
  });

  return jsonSchema;
}

export function normalizeJsonSchema(schema: unknown): JsonSchema | undefined {
  if (!schema) return undefined;
  return isZodSchema(schema) ? zodToJsonSchema(schema) : stripSchemaMeta({ ...(schema as JsonSchema) });
}

export function buildMultipartBodySchema(schema: unknown): JsonSchema | undefined {
  const body = normalizeJsonSchema(schema);
  if (!body || typeof body !== 'object') return undefined;

  const props = body.properties ?? {};
  const fields = props.fields;
  const files = props.files;

  if (!fields || !files) {
    if (!body.type && body.properties) body.type = 'object';
    return body;
  }

  const flattenedProps: Record<string, any> = {};
  const required = new Set<string>();

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
