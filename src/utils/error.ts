import { Prisma } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';

function normalizeTarget(target: unknown): string {
    if (!target) return 'record';

    // Case 1: Prisma returns array of fields
    if (Array.isArray(target)) {
        return target.join(', ');
    }

    // Case 2: Prisma returns index name like "name_UNIQUE"
    if (typeof target === 'string') {
        return target
            .replace(/_UNIQUE$/i, '')   // remove _UNIQUE
            .replace(/_/g, ' ')         // underscores → spaces
            .trim();
    }

    return 'record';
}
export function errorHandler(
    error: unknown,
    request: FastifyRequest,
    reply: FastifyReply
): void {

    const send = (
        statusCode: number,
        message: string,
        options?: {
            error?: string;
            code?: string;
            details?: unknown;
        }
    ) => {
        reply.status(statusCode).send({
            success: false,
            statusCode,
            message,
            error: options?.error,
            code: options?.code,
            details: options?.details
        });
    };

    /* ───────── Prisma Errors ───────── */

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {

            case 'P2002': {
                const target = error.meta?.target;
                const field = normalizeTarget(target);
                if (
                    target === 'uq_week_category' ||
                    (Array.isArray(target) &&
                        target.includes('weekId') &&
                        target.includes('category'))
                ) {
                    send(409, 'Diet chart already exists for this week and category', {
                        error: 'DIET_CHART_EXISTS'
                    });
                    return;
                }
                if (
                    target === 'uq_week_name_order' ||
                    (Array.isArray(target) &&
                        target.includes('name') &&
                        target.includes('order'))
                ) {
                    send(409, 'Week name already exists for this order and name', {
                        error: 'WEEK_NAME_EXISTS'
                    });
                    return;
                }

                // 🔁 Generic duplicate fallback
                send(409, `Record Already exist with field  ${field}`, {
                    error: 'DUPLICATE_ENTRY',
                    details: target
                });
                console.log({
                    error: 'DUPLICATE_ENTRY',
                    details: target
                });

                return;
            }

            case 'P2025':
                send(404, 'Record not found', {
                    error: 'NOT_FOUND',
                    details: error.meta
                });
                return;

            default:
                send(400, error.message, {
                    error: 'PRISMA_ERROR',
                    details: error.meta
                });
                return;
        }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
        send(400, 'Invalid parameters for form fields', {
            error: 'BAD_REQUEST'
        });
        return;
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
        send(500, 'Database client initialization failed', {
            error: 'DB_INIT_FAILED'
        });
        return;
    }

    /* ───────── http-errors (REMOTE_LOGIN, SESSION_EXPIRED, etc.) ───────── */

    if (error && typeof (error as any).statusCode === 'number') {
        const e = error as any;

        send(e.statusCode, e.message, {
            error: e.code || e.name,
            code: e.code
        });
        return;
    }

    /* ───────── AJV Validation ───────── */

    if (error && (error as any).validation) {
        send(422, 'Request validation failed', {
            error: 'VALIDATION_ERROR',
            details: (error as any).validation
        });
        return;
    }

    /* ───────── Network / Payload Errors ───────── */

    if ((error as any)?.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
        send(413, 'Request payload too large', {
            error: 'PAYLOAD_TOO_LARGE'
        });
        return;
    }

    if ((error as any)?.code === 'ECONNREFUSED') {
        send(503, 'Cannot connect to database', {
            error: 'SERVICE_UNAVAILABLE'
        });
        return;
    }

    /* ───────── Fallback ───────── */

    request.log?.error({ err: error }, 'Unhandled error');
    send(500, 'Something went wrong', {
        error: 'INTERNAL_SERVER_ERROR'
    });
}
