"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureRoles = ensureRoles;
const http_errors_1 = __importDefault(require("http-errors"));
// Factory that returns a Fastify preHandler
function ensureRoles(allowedRoles) {
    // normalize allowed for faster checks
    const normAllowed = new Set(allowedRoles.map(r => (typeof r === 'string' ? String(r).toUpperCase() : r)));
    return async function (req, reply) {
        const user = req.user; // your authMiddleware should set req.user
        if (!user) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const roleRaw = (user.role ?? '').toString();
        const roleNorm = typeof user.role === 'string' ? roleRaw.toUpperCase() : Number(user.role);
        // if numeric role, compare to numeric allowed set; if string, compare string set
        const allowed = (typeof roleNorm === 'number' && normAllowed.has(roleNorm)) ||
            (typeof roleNorm === 'string' && normAllowed.has(roleNorm));
        if (!allowed) {
            throw (0, http_errors_1.default)(403, 'You are not Authorized!');
        }
        // allowed -> continue
        return;
    };
}
//# sourceMappingURL=role.middlewar.js.map