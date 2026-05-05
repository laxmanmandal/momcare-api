import { z } from 'zod';
import { zodToJsonSchema, ZOD_DOCS_ONLY } from '../utils/zodOpenApi';

// Stub .openapi to prevent crashes if it was chained in schema definitions
if (typeof (z.ZodType.prototype as any).openapi === 'undefined') {
  (z.ZodType.prototype as any).openapi = function() { return this; };
}

export function zodToSwagger(schema: z.ZodType<any>) {
  const jsonSchema = zodToJsonSchema(schema as any, { target: 'openApi3' }) as any;
  
  const result: any = {
    type: 'object',
    ...jsonSchema,
  };
  
  if (result.$schema) delete result.$schema;

  if (result.properties) {
    for (const [key, value] of Object.entries(result.properties)) {
      const val = value as any;
      const isEmpty = Object.keys(val).length === 0;
      const isKnownFile = ['icon', 'image', 'thumbnail', 'media', 'file', 'url'].includes(key);
      
      if (isEmpty || isKnownFile) {
        result.properties[key] = { type: 'string', format: 'binary' };
      }
    }
  }
  
  // Bypass Fastify AJV validation so multipart streams can be 
  // successfully parsed and validated inside the route handler
  result[ZOD_DOCS_ONLY] = true;
  
  return result;
}

export { ValidationError, type ValidationFieldError } from './error';
export {
  validateData,
  validateRequest,
  type ValidationSource,
  type ValidatedRequestData
} from './validate';
export * from './schemas';
