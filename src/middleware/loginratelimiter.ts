import type { FastifyReply } from 'fastify';

type AttemptRecord = { count: number; blockedUntil?: number };
type AttemptStore = Record<string, AttemptRecord>;

// In-memory store for login attempts
const loginAttempts: AttemptStore = {};

// Middleware to check if user is blocked
export function loginRateLimiter(
    email: string,
    ip: string,
    reply: FastifyReply
): string | false {
    const key = `${ip}:${email}`;
    const now = Date.now();
    const record = loginAttempts[key];

    if (record?.blockedUntil && record.blockedUntil > now) {
        reply.status(429).send({
            success: false,
            statusCode: 429,
            message: 'Too many failed login attempts. Try again in 30 minutes.',
            error: 'Too Many Requests'
        });
        return false;
    }

    return key;
}

// ✅ Exported function to record failed login attempts
export function recordFailedAttempt(key: string): void {
    const now = Date.now();

    if (!loginAttempts[key]) {
        loginAttempts[key] = { count: 1 };
    } else {
        const record = loginAttempts[key];

        // If still blocked, do not increment count
        if (record.blockedUntil && record.blockedUntil > now) return;

        record.count += 1;

        if (record.count >= 3) {
            record.blockedUntil = now + 30 * 60 * 1000; // block 30 min
        }
    }
}

// Reset attempts after successful login
export function resetAttempts(key: string): void {
    delete loginAttempts[key];
}
