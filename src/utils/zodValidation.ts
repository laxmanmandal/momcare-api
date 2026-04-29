import createHttpError from "http-errors";
import { z, ZodError, type ZodTypeAny } from "zod";

export function parseWithZod<TSchema extends ZodTypeAny>(schema: TSchema, data: unknown): z.infer<TSchema> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw createHttpError(422, "Request validation failed", {
        code: "VALIDATION_ERROR",
        details: error.flatten()
      });
    }

    throw error;
  }
}
