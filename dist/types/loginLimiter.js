"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginAttempts = void 0;
// Key format: `${ip}:${username}`
exports.loginAttempts = new Map();
// Optional auto cleanup
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of exports.loginAttempts.entries()) {
        const isExpired = record.blockUntil !== 0 && now > record.blockUntil;
        if (isExpired && record.fails === 0) {
            exports.loginAttempts.delete(key);
        }
    }
}, 10 * 60 * 1000); // every 10 minutes
//# sourceMappingURL=loginLimiter.js.map