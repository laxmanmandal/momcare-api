export interface LoginAttempt {
    fails: number;
    blockUntil: number; // timestamp (ms)
}

// Key format: `${ip}:${username}`
export const loginAttempts = new Map<string, LoginAttempt>();

// Optional auto cleanup
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of loginAttempts.entries()) {
        const isExpired = record.blockUntil !== 0 && now > record.blockUntil;
        if (isExpired && record.fails === 0) {
            loginAttempts.delete(key);
        }
    }
}, 10 * 60 * 1000); // every 10 minutes
