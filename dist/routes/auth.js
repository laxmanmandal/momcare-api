"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authRoutes;
const authService = __importStar(require("../services/authService"));
const auth_1 = require("../middleware/auth");
const roles_1 = require("../utils/roles");
const otpService_1 = require("../services/otpsms.service.ts/otpService");
const client_1 = __importDefault(require("../prisma/client"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const loginratelimiter_1 = require("../middleware/loginratelimiter");
const otpratelimiter_1 = require("../middleware/otpratelimiter");
const http_errors_1 = __importDefault(require("http-errors"));
const validations_1 = require("../validations");
const validations_2 = require("../validations");
async function authRoutes(app) {
    app.post('/request-otp', {
        config: {
            swaggerPublic: true,
            rateLimit: {
                max: 3,
                timeWindow: 10 * 60 * 1000
            }
        },
        preHandler: [(0, validations_1.validateRequest)(validations_2.requestOtpSchema)],
        schema: {
            tags: ['Auth']
        }
    }, async (req, reply) => {
        const body = req.validated?.body;
        const key = (0, otpratelimiter_1.otpRateLimiter)(body.phone, req, reply);
        if (!key)
            return;
        const phone = (0, otpratelimiter_1.normalizePhone)(body.phone);
        await (0, otpService_1.createAndSendOtpForPhone)(phone);
        (0, otpratelimiter_1.recordSendSuccess)(key);
        return reply.send({ ok: true, message: 'OTP sent' });
    });
    app.post('/verify-otp', {
        config: {
            swaggerPublic: true,
            rateLimit: {
                max: 5,
                timeWindow: 10 * 60 * 1000
            }
        },
        preHandler: [(0, validations_1.validateRequest)(validations_2.verifyOtpSchema)],
        schema: {
            tags: ['Auth']
        }
    }, async (req, reply) => {
        const { phone: rawPhone, otp } = req.validated?.body;
        const key = (0, otpratelimiter_1.otpRateLimiter)(rawPhone, req, reply);
        if (!key)
            return;
        const phone = (0, otpratelimiter_1.normalizePhone)(rawPhone);
        const ip = (Array.isArray(req.headers['x-forwarded-for'])
            ? req.headers['x-forwarded-for'][0]
            : req.headers['x-forwarded-for'])?.split(',')[0]?.trim()
            || req.ip;
        try {
            const result = await (0, otpService_1.verifyOtpForPhone)(phone, otp, ip);
            if (!result.success) {
                (0, otpratelimiter_1.recordFailedVerification)(key);
                return reply
                    .code(result.code || 400)
                    .send({ success: false, message: result.error || 'Invalid OTP' });
            }
            (0, otpratelimiter_1.resetOtpAttempts)(key);
            return reply.send({
                success: true,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                user: result.user
            });
        }
        catch (err) {
            (0, otpratelimiter_1.recordFailedVerification)(key);
            return reply
                .code(500)
                .send({ success: false, message: 'Internal Server Error' });
        }
    });
    app.post('/signup', {
        preHandler: [
            auth_1.authMiddleware,
            app.accessControl.check('CREATE_USER'),
            (0, validations_1.validateRequest)(validations_2.signupSchema)
        ],
        schema: {
            tags: ['Auth']
        }
    }, async (req, reply) => {
        const actorRole = req.user?.role;
        const body = req.validated?.body;
        const targetRole = body.role;
        if (!(0, roles_1.canCreateRole)(actorRole, targetRole)) {
            return reply.code(403).send({
                success: false,
                message: `Insufficient privilege to create role: ${targetRole}`
            });
        }
        const payload = {
            ...body,
            belongsToId: body.belongsToId
                ? Number(body.belongsToId)
                : req.user?.belongsToId
                    ? Number(req.user.belongsToId)
                    : undefined,
            createdBy: req.user?.id ? Number(req.user.id) : undefined
        };
        const created = await authService.signup(payload);
        return reply.code(201).send({
            success: true,
            message: 'User created successfully',
            data: created
        });
    });
    app.post('/login', {
        config: {
            swaggerPublic: true,
            rateLimit: {
                max: 5,
                timeWindow: 15 * 60 * 1000
            }
        },
        preHandler: [(0, validations_1.validateRequest)(validations_2.loginSchema)],
        schema: {
            tags: ['Auth']
        }
    }, async (req, reply) => {
        const ip = (Array.isArray(req.headers['x-forwarded-for'])
            ? req.headers['x-forwarded-for'][0]
            : req.headers['x-forwarded-for'])?.split(',')[0]?.trim()
            || req.ip;
        const body = req.validated?.body;
        const key = (0, loginratelimiter_1.loginRateLimiter)(body.email, ip, reply);
        if (!key)
            return;
        try {
            const { accessToken, refreshToken } = await authService.login(body, ip);
            (0, loginratelimiter_1.resetAttempts)(key);
            return reply.code(200).send({ accessToken, refreshToken });
        }
        catch (err) {
            (0, loginratelimiter_1.recordFailedAttempt)(key);
            return reply.status(401).send({
                success: false,
                message: err?.message || 'Invalid credentials'
            });
        }
    });
    app.post('/refresh', {
        config: {
            swaggerPublic: true,
            rateLimit: {
                max: 10,
                timeWindow: 15 * 60 * 1000
            }
        },
        preHandler: [(0, validations_1.validateRequest)(validations_2.refreshTokenSchema)],
        schema: {
            tags: ['Auth']
        }
    }, async (req, reply) => {
        const { refreshToken } = req.validated?.body;
        const tokens = await authService.refreshTokenService(refreshToken);
        return reply.send(tokens);
    });
    app.post('/change-password', {
        preHandler: [
            auth_1.authMiddleware,
            app.accessControl.check('CHANGE_PASSWORD'),
            (0, validations_1.validateRequest)(validations_2.changePasswordSchema)
        ],
        schema: {
            tags: ['Auth']
        }
    }, async (req, res) => {
        const authUserId = Number(req.user.id);
        const { userId, old_password, new_password } = req.validated?.body;
        if (authUserId !== userId) {
            throw (0, http_errors_1.default)(403, 'Unauthorized');
        }
        const user = await client_1.default.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).send({ success: false, message: 'User not found.' });
        }
        const isMatch = await bcryptjs_1.default.compare(old_password, user.password);
        if (!isMatch) {
            return res.status(400).send({ success: false, message: 'Old password is incorrect.' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(new_password, 10);
        await client_1.default.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
        return res.status(200).send({ success: true, message: 'Password updated successfully.' });
    });
}
//# sourceMappingURL=auth.js.map