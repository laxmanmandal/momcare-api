"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlyOrg = void 0;
exports.authMiddleware = authMiddleware;
const jwt_1 = require("../utils/jwt");
const role_middlewar_1 = require("./role.middlewar");
const client_1 = __importDefault(require("../prisma/client"));
async function authMiddleware(req, reply) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return reply.code(401).send({
                code: 'NO_TOKEN',
                message: 'No token provided',
            });
        }
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;
        /* 1️⃣ Verify access token */
        let payload;
        try {
            payload = (0, jwt_1.verifyToken)(token);
        }
        catch (err) {
            if (err.name === 'TokenExpiredError') {
                return reply.code(401).send({
                    code: 'SESSION_EXPIRED',
                    message: 'Session expired',
                });
            }
            return reply.code(401).send({
                code: 'INVALID_TOKEN',
                message: 'Invalid token',
            });
        }
        if (!payload || payload.type !== 'access' || !payload.id || !payload.sid) {
            return reply.code(401).send({
                code: 'INVALID_TOKEN',
                message: 'Invalid token',
            });
        }
        /* 2️⃣ Load session by user */
        const session = await client_1.default.userSessions.findUnique({
            where: { userId: payload.id },
        });
        if (!session) {
            return reply.code(401).send({
                code: 'SESSION_EXPIRED',
                message: 'Session expired',
            });
        }
        /* 🔥 3️⃣ Detect remote login */
        if (payload.sid !== session.sessionId) {
            return reply.code(409).send({
                code: 'REMOTE_LOGIN',
                message: 'Logged in from another device',
            });
        }
        /* 4️⃣ Attach user */
        req.user = {
            id: payload.id,
            uuid: payload.uuid,
            name: payload.name,
            email: payload.email,
            role: payload.role,
            createdBy: payload.createdBy,
            belongsToId: payload.belongsToId,
            sessionId: payload.sid,
        };
    }
    catch (err) {
        req.log.error(err, 'Auth middleware failed');
        return reply.code(401).send({
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
        });
    }
}
exports.onlyOrg = (0, role_middlewar_1.ensureRoles)(['SUPER_ADMIN']);
//# sourceMappingURL=auth.js.map