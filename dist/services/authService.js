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
exports.signup = signup;
exports.login = login;
exports.refreshTokenService = refreshTokenService;
exports.getUserFromPayload = getUserFromPayload;
const client_1 = __importDefault(require("../prisma/client"));
const jwt_1 = require("../utils/jwt");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_2 = require("@prisma/client");
const roles_1 = require("../utils/roles");
const http_errors_1 = __importStar(require("http-errors"));
const loginActivity_1 = require("./loginActivity");
const crypto_1 = require("crypto");
function generateCustomId(role) {
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
// user registration 
async function signup(data) {
    /* ─────────────── 1️⃣ Resolve & validate role ─────────────── */
    const rawRole = data?.role;
    if (!rawRole)
        throw new http_errors_1.BadRequest('Role is required');
    const canonicalRole = (0, roles_1.resolveRoleName)(rawRole);
    const roleForDb = canonicalRole;
    /* ─────────────── 2️⃣ Required fields ─────────────── */
    if (!data?.name) {
        throw new http_errors_1.BadRequest('Name is required');
    }
    // 🔥 ONLY USER gets email exception
    if (roleForDb !== 'USER') {
        if (!data?.email) {
            throw new http_errors_1.BadRequest('Email is required');
        }
        if (!data?.password) {
            throw new http_errors_1.BadRequest('Password is required');
        }
    }
    /* ─────────────── 3️⃣ Normalize numbers ─────────────── */
    const toNumber = (v) => v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v);
    const belongsToId = toNumber(data.belongsToId);
    const createdBy = toNumber(data.createdBy);
    /* ─────────────── 4️⃣ Prepare auth fields ─────────────── */
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : undefined;
    const phone = typeof data.phone === 'string' ? data.phone.trim() : data.phone;
    const name = typeof data.name === 'string' ? data.name.trim() : data.name;
    const location = typeof data.location === 'string' ? data.location.trim() : data.location;
    const type = typeof data.type === 'string' ? data.type.trim() : data.type;
    const hashedPassword = data.password ? await bcryptjs_1.default.hash(String(data.password), 10) : undefined;
    const uuid = await generateCustomId(roleForDb);
    /* ─────────────── 5️⃣ DB transaction ─────────────── */
    const user = await client_1.default.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
            data: {
                name,
                email: email ?? null,
                password: roleForDb !== 'USER' ? hashedPassword : null,
                phone,
                type: type ?? undefined,
                location: location ?? undefined,
                role: roleForDb,
                uuid,
                createdBy,
                belongsToId
            }
        });
        return createdUser;
    });
    /* ─────────────── 6️⃣ Safe response ─────────────── */
    return {
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
    };
}
async function login(data, ip) {
    if (!data.email || !data.password) {
        throw new http_errors_1.Unauthorized("Unauthorized");
    }
    const email = String(data.email).trim().toLowerCase();
    const user = await client_1.default.user.findUnique({
        where: { email },
        select: {
            id: true,
            uuid: true,
            name: true,
            password: true,
            role: true,
            belongsToId: true,
            createdBy: true,
        },
    });
    if (!user || !user.password) {
        throw new http_errors_1.Unauthorized("Invalid credentials");
    }
    if (user.role === client_2.Role.USER) {
        throw new http_errors_1.Unauthorized("Access denied");
    }
    const valid = await bcryptjs_1.default.compare(data.password, user.password);
    if (!valid) {
        throw new http_errors_1.Unauthorized("Invalid credentials");
    }
    const sessionId = (0, crypto_1.randomUUID)();
    const accessPayload = {
        id: user.id,
        uuid: user.uuid,
        name: user.name ?? "",
        role: user.role,
        belongsToId: user.belongsToId,
        createdBy: user.createdBy,
        sid: sessionId,
    };
    const refreshPayload = {
        id: user.id,
        sid: sessionId,
    };
    const accessToken = (0, jwt_1.signToken)(accessPayload, "7d");
    const refreshToken = (0, jwt_1.signRefreshToken)(refreshPayload, "30d");
    const login = await client_1.default.userSessions.upsert({
        where: { userId: user.id },
        update: {
            sessionId,
            accessToken,
            refreshToken,
        },
        create: {
            userId: user.id,
            sessionId,
            accessToken,
            refreshToken,
        },
    });
    if (login) {
        (0, loginActivity_1.recordLastLogin)({
            userId: user.id,
            uuid: user.uuid,
            ip,
        });
    }
    return { accessToken, refreshToken };
}
async function refreshTokenService(refreshToken) {
    if (!refreshToken) {
        const err = (0, http_errors_1.default)(401, 'Session expired');
        err.code = 'SESSION_EXPIRED';
        throw err;
    }
    /* 1️⃣ Verify refresh token */
    let decoded;
    try {
        decoded = (0, jwt_1.verifyToken)(refreshToken);
    }
    catch {
        const err = (0, http_errors_1.default)(401, 'Session expired');
        err.code = 'SESSION_EXPIRED';
        throw err;
    }
    if (decoded.type !== 'refresh' || !decoded.id || !decoded.sid) {
        const err = (0, http_errors_1.default)(401, 'Session expired');
        err.code = 'SESSION_EXPIRED';
        throw err;
    }
    /* 2️⃣ Find session by USER (not refresh token) */
    const session = await client_1.default.userSessions.findUnique({
        where: { userId: decoded.id },
        include: { User: true },
    });
    if (!session) {
        const err = (0, http_errors_1.default)(401, 'Session expired');
        err.code = 'SESSION_EXPIRED';
        throw err;
    }
    /* 3️⃣ Detect remote login */
    if (decoded.sid !== session.sessionId) {
        const err = (0, http_errors_1.default)(409, 'Logged in from another device');
        err.code = 'REMOTE_LOGIN';
        throw err;
    }
    /* 4️⃣ Create new tokens */
    const payload = {
        id: session.User.id,
        uuid: session.User.uuid,
        sid: session.sessionId,
        role: session.User.role,
        name: session.User.name,
        belongsToId: session.User.belongsToId,
        createdBy: session.User.createdBy,
    };
    const newAccessToken = (0, jwt_1.signToken)(payload, '7d');
    const newRefreshToken = (0, jwt_1.signRefreshToken)(payload, '30d');
    /* 5️⃣ Rotate tokens */
    await client_1.default.userSessions.update({
        where: { userId: session.userId },
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        },
    });
    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    };
}
async function getUserFromPayload(uuid) {
    const user = await client_1.default.user.findUnique({
        where: { uuid },
        select: {
            uuid: true,
            name: true,
            email: true,
            role: true,
            belongsToId: true,
            createdBy: true,
            imageUrl: true,
            isActive: true,
        }
    });
    if (!user)
        throw new http_errors_1.BadRequest('User not found');
    return user;
}
//# sourceMappingURL=authService.js.map