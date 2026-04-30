import { z, type ZodTypeAny, ZodError } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError, type ValidationFieldError } from './error';

export type ValidationSource = 'body' | 'query' | 'params';

export type ValidatedRequestData = {
  body?: unknown;
  query?: unknown;
  params?: unknown;
  [key: string]: unknown;
};

function formatIssues(error: ZodError): ValidationFieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.map(String).join('.') : 'root',
    message: issue.message
  }));
}

export function validateData<TSchema extends ZodTypeAny>(
  schema: TSchema,
  data: unknown
): z.infer<TSchema> {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  throw new ValidationError(formatIssues(result.error));
}

export function validateRequest<TSchema extends ZodTypeAny>(
  schema: TSchema,
  source: ValidationSource = 'body'
) {
  const handler = async (req: any, _reply: FastifyReply) => {
    const parsed = validateData(schema, req[source]);
    const current = (req.validated ?? {}) as ValidatedRequestData;
    current[source] = parsed;
    req.validated = current;
  };
  ;(handler as any)._zodSchema = { source, schema };
  return handler;
}
