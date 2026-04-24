"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCK_MS = exports.VERIFY_LIMIT = exports.SEND_LIMIT = exports.otpAttempts = void 0;
exports.normalizePhone = normalizePhone;
exports.otpRateLimiter = otpRateLimiter;
exports.recordSendSuccess = recordSendSuccess;
exports.recordFailedSend = recordFailedSend;
exports.recordFailedVerification = recordFailedVerification;
exports.resetOtpAttempts = resetOtpAttempts;
exports.otpAttempts = {};
exports.SEND_LIMIT = 5; // max allowed successful sends before block
exports.VERIFY_LIMIT = 5; // max wrong verification attempts before block
exports.BLOCK_MS = 30 * 60 * 1000; // 30 minutes
function normalizePhone(raw) {
    return String(raw || '').replace(/\D/g, ''); // digits only
}
/**
 * Check block state and return key (phone) or reply+false.
 * Call this inside handler after body parsed.
 */
function otpRateLimiter(req, reply) {
    const rawPhone = req.body?.phone;
    if (!rawPhone) {
        reply.status(400).send({ success: false, message: 'Phone is required' });
        return false;
    }
    const phone = normalizePhone(rawPhone);
    if (!phone) {
        reply.status(400).send({ success: false, message: 'Invalid phone' });
        return false;
    }
    const key = phone;
    const now = Date.now();
    const rec = exports.otpAttempts[key];
    // if currently blocked
    if (rec?.blockedUntil && rec.blockedUntil > now) {
        const retryAfterMin = Math.ceil((rec.blockedUntil - now) / (60 * 1000));
        reply.status(429).send({ success: false, message: `Too many attempts. Try again in ${retryAfterMin} minutes.` });
        return false;
    }
    // If existing record already reached send limit (but no blockedUntil set),
    // set blockedUntil now and reply blocked.
    if (rec && rec.sendCount >= exports.SEND_LIMIT) {
        rec.blockedUntil = now + exports.BLOCK_MS;
        const retryAfterMin = Math.ceil(exports.BLOCK_MS / (60 * 1000));
        reply.status(429).send({ success: false, message: `Too many attempts. Try again in ${retryAfterMin} minutes.` });
        return false;
    }
    // Ensure record exists
    if (!exports.otpAttempts[key]) {
        exports.otpAttempts[key] = { sendCount: 0, failedVerifyCount: 0 };
    }
    // debug (enable in dev)
    req.log.debug({ key, rec: exports.otpAttempts[key] }, 'otp limiter key');
    return key;
}
/** Call after a successful OTP send to increment sendCount and block if threshold reached. */
function recordSendSuccess(key) {
    const now = Date.now();
    if (!exports.otpAttempts[key])
        exports.otpAttempts[key] = { sendCount: 1, failedVerifyCount: 0 };
    else {
        const rec = exports.otpAttempts[key];
        // If already blocked, don't change anything
        if (rec.blockedUntil && rec.blockedUntil > now)
            return;
        rec.sendCount += 1;
        if (rec.sendCount >= exports.SEND_LIMIT) {
            rec.blockedUntil = now + exports.BLOCK_MS;
        }
    }
}
/** Optionally call when send fails (counts as a penalty) */
function recordFailedSend(key) {
    // treat failed sends same as success penalty or skip — here we won't count them,
    // but you can uncomment to count failed sends:
    // recordSendSuccess(key);
}
/** Call when verification fails (wrong OTP). Increments failedVerifyCount and blocks when threshold reached. */
function recordFailedVerification(key) {
    const now = Date.now();
    if (!exports.otpAttempts[key])
        exports.otpAttempts[key] = { sendCount: 0, failedVerifyCount: 1 };
    else {
        const rec = exports.otpAttempts[key];
        if (rec.blockedUntil && rec.blockedUntil > now)
            return; // already blocked
        rec.failedVerifyCount += 1;
        if (rec.failedVerifyCount >= exports.VERIFY_LIMIT) {
            rec.blockedUntil = now + exports.BLOCK_MS;
        }
    }
}
/** Reset everything for this phone (call on successful verification) */
function resetOtpAttempts(key) {
    delete exports.otpAttempts[key];
}
//# sourceMappingURL=otpratelimiter.js.map