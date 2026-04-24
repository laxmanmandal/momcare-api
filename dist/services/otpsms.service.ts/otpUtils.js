"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOTP = generateOTP;
exports.hashOTP = hashOTP;
exports.verifyOTP = verifyOTP;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
function generateOTP(len = 6) {
    let otp = '';
    for (let i = 0; i < len; i++)
        otp += Math.floor(Math.random() * 10);
    return otp;
}
async function hashOTP(otp) {
    return bcryptjs_1.default.hash(otp, 10);
}
async function verifyOTP(otp, hash) {
    return bcryptjs_1.default.compare(otp, hash);
}
//# sourceMappingURL=otpUtils.js.map