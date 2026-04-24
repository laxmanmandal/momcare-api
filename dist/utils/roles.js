"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_RANK = void 0;
exports.resolveRoleName = resolveRoleName;
exports.generateCustomId = generateCustomId;
exports.canCreateRole = canCreateRole;
const client_1 = require("@prisma/client");
const ROLE_KEYS = Object.keys(client_1.Role); // e.g. ['SUPER_ADMIN', 'MANAGER', ...]
const ROLE_KEY_SET = new Set(ROLE_KEYS);
const ROLE_VALUE_TO_KEY = new Map(); // maps value -> key
for (const k of ROLE_KEYS) {
    const v = client_1.Role[k];
    // store both string uppercased and number (if numeric)
    ROLE_VALUE_TO_KEY.set(String(v).toUpperCase(), k);
    if (typeof v === "number")
        ROLE_VALUE_TO_KEY.set(v, k);
}
function resolveRoleName(roleInput) {
    if (roleInput === undefined || roleInput === null) {
        throw new Error("Role is required");
    }
    // If it's an object that might contain a role, unwrap common properties
    if (typeof roleInput === "object" && !Array.isArray(roleInput)) {
        const maybe = roleInput.role ?? roleInput.name ?? roleInput.value;
        if (maybe !== undefined && maybe !== null) {
            console.log('log-----', maybe);
            return resolveRoleName(maybe);
        }
    }
    // Numbers (actual numeric enum values)
    if (typeof roleInput === "number") {
        const key = ROLE_VALUE_TO_KEY.get(roleInput);
        if (!key)
            throw new Error(`Unknown role: ${roleInput}`);
        return key;
    }
    // Normalize string-ish input
    const raw = String(roleInput).trim();
    if (!raw)
        throw new Error(`Unknown role: ${roleInput}`);
    // 1) Direct key match (case-sensitive or case-insensitive)
    if (ROLE_KEY_SET.has(raw))
        return raw;
    const upper = raw.toUpperCase();
    if (ROLE_KEY_SET.has(upper))
        return upper;
    // 2) Value match (case-insensitive via map)
    const byValue = ROLE_VALUE_TO_KEY.get(upper);
    if (byValue)
        return byValue;
    // 3) No match
    throw new Error(`Unknown role: ${roleInput}`);
}
async function generateCustomId(role) {
    const prefixes = {
        SUPER_ADMIN: "SA",
        ADMIN: "AD",
        CHANNEL_SUPER_ADMIN: "CH",
        CHANNEL_ADMIN: "CA",
        PARTNER_SUPER_ADMIN: "PS",
        PARTNER_ADMIN: "PA",
        USER: "U",
    };
    const key = typeof role === 'string' ? role : String(role);
    const prefix = prefixes[key];
    if (!prefix)
        throw new Error(`Unknown role: ${role}`);
    const randomNumber = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}${randomNumber}`;
}
/**
 * ROLE_RANK mapping remains explicit and easy to review.
 * Keep keys identical to your enum keys (they are treated as the canonical names).
 */
exports.ROLE_RANK = {
    SUPER_ADMIN: 100,
    ADMIN: 90,
    CHANNEL_SUPER_ADMIN: 80,
    CHANNEL_ADMIN: 70,
    PARTNER_SUPER_ADMIN: 60,
    PARTNER_ADMIN: 50,
    USER: 10,
};
/**
 * canCreateRole - returns boolean (unless strict=true, then throws on bad role)
 * - actorRoleInput, targetRoleInput: any of the accepted shapes supported by resolveRoleName
 * - strict: if true -> bubble up resolveRoleName errors; if false -> return false on errors (previous behavior)
 */
function canCreateRole(actorRoleInput, targetRoleInput, opts) {
    const strict = opts?.strict ?? false;
    try {
        const actor = resolveRoleName(actorRoleInput);
        const target = resolveRoleName(targetRoleInput);
        const actorRank = exports.ROLE_RANK[actor];
        const targetRank = exports.ROLE_RANK[target];
        if (actorRank === undefined || targetRank === undefined) {
            // missing mapping in ROLE_RANK: treat as unauthorized
            // If you want to catch this during development, set strict=true to throw.
            if (strict) {
                throw new Error(`Missing role rank mapping for actor=${actor} or target=${target}`);
            }
            return false;
        }
        return actorRank > targetRank;
    }
    catch (err) {
        if (strict)
            throw err;
        // optional: enable a logger here instead of console.warn
        return false;
    }
}
//# sourceMappingURL=roles.js.map