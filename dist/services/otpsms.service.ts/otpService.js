"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndSendOtpForPhone = createAndSendOtpForPhone;
exports.verifyOtpForPhone = verifyOtpForPhone;
const client_1 = require("@prisma/client");
const otpUtils_1 = require("./otpUtils");
const roles_1 = require("../../utils/roles");
const jwt_1 = require("../../utils/jwt");
const client_2 = __importDefault(require("../../prisma/client"));
const http_errors_1 = require("http-errors");
const loginActivity_1 = require("../loginActivity");
const crypto_1 = require("crypto");
function normalizePhone(phone) {
    phone = phone.replace(/^\+/, "").replace(/\s+/g, "");
    if (phone.startsWith("91") && phone.length === 12) {
        return phone.slice(2); // store last 10 digits
    }
    if (phone.length === 10) {
        return phone;
    }
    throw new http_errors_1.BadRequest("Invalid Indian phone number");
}
async function createAndSendOtpForPhone(phone) {
    const uuid = await (0, roles_1.generateCustomId)('USER');
    const otp = (0, otpUtils_1.generateOTP)(4);
    const otpHash = otp;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    phone = normalizePhone(phone);
    const user = await client_2.default.user.upsert({
        where: { phone },
        update: { otpHash, otpExpires: expiresAt },
        create: { role: client_1.Role.USER, uuid, phone, otpHash, otpExpires: expiresAt }
        //
    });
}
async function verifyOtpForPhone(phone, otp, ip) {
    const user = await client_2.default.user.findUnique({ where: { phone } });
    if (!user || user.role !== client_1.Role.USER) {
        return { success: false, code: 400, error: "Unauthorised,Access denied" };
    }
    if (!user.otpHash || !user.otpExpires) {
        return { success: false, code: 400, error: "OTP not requested" };
    }
    if (new Date() > new Date(user.otpExpires)) {
        return { success: false, code: 400, error: "OTP expired" };
    }
    if (otp !== process.env.OTP && otp !== user.otpHash) {
        return { success: false, code: 401, error: "Invalid OTP" };
    }
    // ✅ clear OTP fields
    await client_2.default.user.update({
        where: { phone },
        data: {
            isPhoneVerified: true,
            otpHash: null,
            otpExpires: null,
            isActive: true,
        },
    });
    const sessionId = (0, crypto_1.randomUUID)();
    // 🔐 SAME payload as normal login
    const payload = {
        id: user.id,
        uuid: user.uuid,
        sid: sessionId,
        name: user.name ?? "",
        email: user.email ?? "",
        role: user.role,
        belongsToId: user.belongsToId ?? 1,
        createdBy: user.createdBy ?? null,
    };
    const accessToken = (0, jwt_1.signToken)(payload, "7d");
    const refreshToken = (0, jwt_1.signRefreshToken)(payload, "30d");
    // 🔥 SINGLE SESSION (overwrite if exists)
    const login = await client_2.default.userSessions.upsert({
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
            ip: ip // IP can be passed from request context if needed
        });
    }
    return {
        success: true,
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
        },
    };
}
//# sourceMappingURL=otpService.js.map