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

export function zodToJsonSchema(schema: unknown, _options?: unknown): JsonSchema {
  if (!isZodSchema(schema)) {
    return stripSchemaMeta({ ...((schema as JsonSchema) ?? {}) });
  }

  const jsonSchema = stripSchemaMeta(
    z.toJSONSchema(schema, {
      io: 'input',
      target: 'draft-7',
      unrepresentable: 'any',
    } as any) as JsonSchema,
  );

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
