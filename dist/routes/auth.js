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
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../utils/roles");
const otpService_1 = require("../services/otpsms.service.ts/otpService");
const client_2 = __importDefault(require("../prisma/client"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const loginratelimiter_1 = require("../middleware/loginratelimiter");
const otpratelimiter_1 = require("../middleware/otpratelimiter");
async function authRoutes(app) {
    const roleEnum = Object.keys(client_1.Role).filter(k => isNaN(Number(k)));
    app.post('/request-otp', {
        config: {
            swaggerPublic: true
        },
        schema: {
            tags: ['Auth'],
            body: {
                type: 'object',
                required: ['phone'],
                additionalProperties: false,
                properties: {
                    phone: { type: 'string', minLength: 6 }
                }
            }
        }
    }, async (req, reply) => {
        const key = (0, otpratelimiter_1.otpRateLimiter)(req, reply);
        if (!key)
            return; // blocked or invalid
        const phone = (0, otpratelimiter_1.normalizePhone)(req.body.phone);
        await (0, otpService_1.createAndSendOtpForPhone)(phone);
        (0, otpratelimiter_1.recordSendSuccess)(key);
        return reply.send({ ok: true, message: 'OTP sent' });
    });
    app.post("/verify-otp", {
        config: {
            swaggerPublic: true
        },
        schema: {
            tags: ['Auth'],
            body: {
                type: 'object',
                required: ['phone', 'otp'],
                additionalProperties: false,
                properties: {
                    phone: { type: 'string', minLength: 6 },
                    otp: { type: 'string', minLength: 4 }
                }
            }
        }
    }, async (req, reply) => {
        const key = (0, otpratelimiter_1.otpRateLimiter)(req, reply);
        if (!key)
            return;
        const { phone: rawPhone, otp } = req.body;
        if (!rawPhone || !otp) {
            return reply.code(400).send({ success: false, error: "phone and otp required" });
        }
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
                    .send({ success: false, message: result.error || "Invalid OTP" });
            }
            (0, otpratelimiter_1.resetOtpAttempts)(key);
            return reply.send({
                success: true,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                user: result.user,
            });
        }
        catch (err) {
            (0, otpratelimiter_1.recordFailedVerification)(key);
            return reply
                .code(500)
                .send({ success: false, message: "Internal Server Error" });
        }
    });
    app.post('/signup', {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('CREATE_USER')],
        schema: {
            tags: ['Auth'],
            body: {
                type: 'object',
                additionalProperties: false,
                required: ['role', 'phone', 'name'],
                properties: {
                    name: { type: 'string', minLength: 2 },
                    type: { type: 'string' },
                    location: { type: 'string', minLength: 2 },
                    email: { type: 'string', format: 'email' },
                    phone: { type: 'string', minLength: 6 },
                    password: { type: 'string', minLength: 8 },
                    role: { type: 'string', enum: roleEnum },
                    belongsToId: { type: 'integer' },
                    createdBy: { type: 'integer' },
                    planId: { type: ['integer', 'null'], minimum: 1 }
                }
            }
        }
    }, async (req, reply) => {
        console.log(req.body);
        const actorRole = req.user?.role;
        const targetRole = req.body.role;
        // Permission check
        if (!(0, roles_1.canCreateRole)(actorRole, targetRole)) {
            return reply.code(403).send({
                success: false,
                message: `Insufficient privilege to create role: ${targetRole}`
            });
        }
        // Normalize meta fields
        const payload = {
            ...req.body,
            belongsToId: req.body.belongsToId
                ? Number(req.body.belongsToId)
                : req.user?.belongsToId
                    ? Number(req.user.belongsToId)
                    : undefined,
            createdBy: req.user?.id ? Number(req.user.id) : undefined
        };
        console.log(payload);
        const created = await authService.signup(payload);
        return reply.code(201).send({
            success: true,
            message: 'User created successfully',
            data: created
        });
    });
    // login route (keeps schema simple)
    app.post('/login', {
        config: {
            swaggerPublic: true
        },
        schema: {
            tags: ['Auth'],
            body: {
                type: 'object',
                required: ['email', 'password'],
                additionalProperties: false,
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 }
                }
            }
        }
    }, async (req, reply) => {
        const key = (0, loginratelimiter_1.loginRateLimiter)(req, reply);
        if (!key)
            return;
        const ip = (Array.isArray(req.headers['x-forwarded-for'])
            ? req.headers['x-forwarded-for'][0]
            : req.headers['x-forwarded-for'])?.split(',')[0]?.trim()
            || req.ip;
        try {
            const { accessToken, refreshToken } = await authService.login(req.body, ip);
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
    // refresh route
    app.post('/refresh', {
        config: {
            swaggerPublic: true
        },
        schema: {
            tags: ['Auth'],
            body: {
                type: 'object',
                required: ['refreshToken'],
                additionalProperties: false,
                properties: {
                    refreshToken: { type: 'string', minLength: 1 }
                }
            }
        },
    }, async (req, reply) => {
        const tokens = await authService.refreshTokenService(req.body.refreshToken);
        return reply.send(tokens);
    });
    app.post('/change-password', {
        schema: {
            tags: ['Auth'],
        },
        preHandler: [auth_1.authMiddleware, app.accessControl.check('CHANGE_PASSWORD')],
    }, async (req, res) => {
        const authUserId = Number(req.user.id); // assuming user is authenticated
        const userId = Number(req.body.userId);
        const { old_password, new_password } = req.body;
        if (!old_password || !new_password) {
            return res.status(400).send({ success: false, message: "Both old and new passwords are required." });
        }
        if (authUserId !== userId) {
            return res.status(400).send({ success: false, message: "Unauthorised !" });
        }
        // 1. Fetch user
        const user = await client_2.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).send({ success: false, message: "User not found." });
        }
        // 2. Compare old password
        const isMatch = await bcryptjs_1.default.compare(old_password, user.password);
        console.log(isMatch);
        if (!isMatch) {
            return res.status(400).send({ success: false, message: "Old password is incorrect." });
        }
        // 3. Hash new password
        const hashedPassword = await bcryptjs_1.default.hash(new_password, 10);
        console.log(hashedPassword);
        // 4. Update password
        await client_2.default.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        return res.status(200).send({ success: true, message: "Password updated successfully." });
    });
}
//# sourceMappingURL=auth.js.map