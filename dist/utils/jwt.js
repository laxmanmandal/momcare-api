"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
/* ===================== ACCESS TOKEN ===================== */
function signToken(payload, expiresIn = "7d") {
    return jsonwebtoken_1.default.sign({
        id: payload.id,
        createdBy: payload.createdBy,
        belongsToId: payload.belongsToId,
        sid: payload.sid,
        name: payload.name,
        uuid: payload.uuid,
        role: payload.role,
        type: "access",
    }, JWT_SECRET, { expiresIn });
}
/* ===================== REFRESH TOKEN ===================== */
function signRefreshToken(payload, expiresIn = "30d") {
    return jsonwebtoken_1.default.sign({
        id: payload.id,
        sid: payload.sid,
        type: "refresh",
    }, JWT_SECRET, { expiresIn });
}
/* ===================== VERIFY ===================== */
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
//# sourceMappingURL=jwt.js.map