"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationError = exports.ResourceOwnershipError = exports.InsufficientPermissionsError = exports.PermissionError = void 0;
exports.prismaDuplicateField = prismaDuplicateField;
exports.handlePrismaDuplicate = handlePrismaDuplicate;
/**
 * Robust extractor for duplicate field names.
 * Handles:
 *  - err.meta.target = ['email'] or ['User_email_key']
 *  - err.message containing user_email_key / User_email_key
 *  - messages like "Duplicate value: User_email_key" or "Duplicate value user_email_key"
 */
function prismaDuplicateField(err) {
    if (!err || typeof err !== 'object')
        return null;
    const e = err;
    // 1) Prisma meta.target (best)
    const mt = e?.meta?.target;
    if (mt) {
        const arr = Array.isArray(mt) ? mt : [mt];
        for (const token of arr) {
            if (typeof token !== 'string')
                continue;
            const cleaned = cleanupConstraintToken(token);
            if (cleaned)
                return cleaned;
        }
    }
    // 2) If code present, prefer P2002 but fallthrough to message parsing
    if (e?.code === 'P2002' && typeof e?.message === 'string') {
        // try to parse message further below
    }
    // 3) Message parsing (cover all forms)
    const msg = typeof e?.message === 'string' ? e.message : '';
    if (msg) {
        // a) look for pattern user_email_key or User_email_key anywhere
        const constraintMatch = msg.match(/([A-Za-z0-9]+_[A-Za-z0-9]+_key)/i);
        if (constraintMatch?.[1]) {
            const token = constraintMatch[1];
            const cleaned = cleanupConstraintToken(token);
            if (cleaned)
                return cleaned;
        }
        // b) look for Key (email)= or backticks (`email`)
        const detailMatch = msg.match(/Key \(([^)]+)\)=/i)?.[1];
        if (detailMatch)
            return detailMatch.split('.').pop().toLowerCase();
        const backtickMatch = msg.match(/`([^`]+)`/);
        if (backtickMatch?.[1])
            return backtickMatch[1].toLowerCase();
        // c) final fallback: any single word that looks like a field with "_key" removed
        const anyMatch = msg.match(/([A-Za-z0-9_]+)/);
        if (anyMatch?.[1]) {
            const maybe = cleanupConstraintToken(anyMatch[1]);
            if (maybe)
                return maybe;
        }
    }
    return null;
}
function cleanupConstraintToken(token) {
    if (!token || typeof token !== 'string')
        return null;
    let t = token.trim();
    // remove quotes if present
    t = t.replace(/^"+|"+$/g, '');
    t = t.replace(/^'+|'+$/g, '');
    // lower-case for consistency
    const lower = t.toLowerCase();
    // If it's already a simple field name (email, phone)
    if (/^[a-z0-9_]+$/.test(lower) && !lower.endsWith('_key')) {
        return lower;
    }
    // If constraint name like user_email_key -> extract 'email'
    const m = lower.match(/(?:^|_)([a-z0-9]+)_key$/i);
    if (m?.[1])
        return m[1];
    // If token contains dot (schema.user_email_key or user.email) -> try last segment
    const last = lower.split('.').pop() ?? lower;
    if (/^[a-z0-9_]+$/.test(last)) {
        // if last looks like user_email_key, strip _key and possible prefix
        const mm = last.match(/(?:^|_)([a-z0-9]+)_key$/i);
        if (mm?.[1])
            return mm[1];
        // if last is simple field
        if (!last.endsWith('_key'))
            return last;
    }
    return null;
}
/**
 * ONLY handle duplicate errors. If not duplicate, rethrow so global handler deals with it.
 */
function handlePrismaDuplicate(err, reply) {
    const field = prismaDuplicateField(err);
    if (!field) {
        // Not a duplicate — let global error handler handle it
        throw err;
    }
    // Log lightly and respond with clean message
    try {
        reply.log.info({ event: 'duplicate', field }, `Duplicate value ${field}`);
    }
    catch {
        // ignore logging failure
    }
    return reply.code(409).send({
        success: false,
        message: `Duplicate value ${field}`,
        field
    });
}
class PermissionError extends Error {
    constructor(message, statusCode = 403, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'PermissionError';
    }
}
exports.PermissionError = PermissionError;
class InsufficientPermissionsError extends PermissionError {
    constructor(requiredPermissions, userPermissions) {
        super('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS', {
            required: requiredPermissions,
            has: userPermissions
        });
    }
}
exports.InsufficientPermissionsError = InsufficientPermissionsError;
class ResourceOwnershipError extends PermissionError {
    constructor(resourceType, resourceId) {
        super(`You don't own this ${resourceType}`, 403, 'RESOURCE_OWNERSHIP_ERROR', {
            resourceType,
            resourceId
        });
    }
}
exports.ResourceOwnershipError = ResourceOwnershipError;
class AuthenticationError extends PermissionError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_REQUIRED');
    }
}
exports.AuthenticationError = AuthenticationError;
//# sourceMappingURL=prisma-error.js.map