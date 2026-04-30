import type { FastifyReply } from 'fastify';

type AttemptRecord = {
    sendCount: number;
    failedVerifyCount: number;
    blockedUntil?: number;
};
type AttemptStore = Record<string, AttemptRecord>;

export const otpAttempts: AttemptStore = {};

export const SEND_LIMIT = 5;     // max allowed successful sends before block
export const VERIFY_LIMIT = 5;   // max wrong verification attempts before block
export const BLOCK_MS = 30 * 60 * 1000; // 30 minutes

export function normalizePhone(raw: string) {
    return String(raw || '').replace(/\D/g, ''); // digits only
}

/**
 * Check block state and return key (phone) or reply+false.
 * Call this inside handler after body parsed.
 */
export function otpRateLimiter(
    phone: string,
    req: { log: { debug: (payload: unknown, message: string) => void } },
    reply: FastifyReply
): string | false {
    const key = normalizePhone(phone);
    const now = Date.now();
    const rec = otpAttempts[key];

    // if currently blocked
    if (rec?.blockedUntil && rec.blockedUntil > now) {
        const retryAfterMin = Math.ceil((rec.blockedUntil - now) / (60 * 1000));
        reply.status(429).send({ success: false, message: `Too many attempts. Try again in ${retryAfterMin} minutes.` });
        return false;
    }

    // If existing record already reached send limit (but no blockedUntil set),
    // set blockedUntil now and reply blocked.
    if (rec && rec.sendCount >= SEND_LIMIT) {
        rec.blockedUntil = now + BLOCK_MS;
        const retryAfterMin = Math.ceil(BLOCK_MS / (60 * 1000));
        reply.status(429).send({ success: false, message: `Too many attempts. Try again in ${retryAfterMin} minutes.` });
        return false;
    }

    // Ensure record exists
    if (!otpAttempts[key]) {
        otpAttempts[key] = { sendCount: 0, failedVerifyCount: 0 };
    }

    // debug (enable in dev)
    req.log.debug({ key, rec: otpAttempts[key] }, 'otp limiter key');

    return key;
}

/** Call after a successful OTP send to increment sendCount and block if threshold reached. */
export function recordSendSuccess(key: string) {
    const now = Date.now();
    if (!otpAttempts[key]) otpAttempts[key] = { sendCount: 1, failedVerifyCount: 0 };
    else {
        const rec = otpAttempts[key];
        // If already blocked, don't change anything
        if (rec.blockedUntil && rec.blockedUntil > now) return;

        rec.sendCount += 1;
        if (rec.sendCount >= SEND_LIMIT) {
            rec.blockedUntil = now + BLOCK_MS;
        }
    }
}

/** Optionally call when send fails (counts as a penalty) */
export function recordFailedSend(key: string) {
    // treat failed sends same as success penalty or skip — here we won't count them,
    // but you can uncomment to count failed sends:
    // recordSendSuccess(key);
}

/** Call when verification fails (wrong OTP). Increments failedVerifyCount and blocks when threshold reached. */
export function recordFailedVerification(key: string) {
    const now = Date.now();
    if (!otpAttempts[key]) otpAttempts[key] = { sendCount: 0, failedVerifyCount: 1 };
    else {
        const rec = otpAttempts[key];
        if (rec.blockedUntil && rec.blockedUntil > now) return; // already blocked
        rec.failedVerifyCount += 1;
        if (rec.failedVerifyCount >= VERIFY_LIMIT) {
            rec.blockedUntil = now + BLOCK_MS;
        }
    }
}

/** Reset everything for this phone (call on successful verification) */
export function resetOtpAttempts(key: string) {
    delete otpAttempts[key];
}
