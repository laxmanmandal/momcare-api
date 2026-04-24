"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrderId = generateOrderId;
exports.generateTransactionId = generateTransactionId;
exports.isAtLeast18 = isAtLeast18;
exports.isFutureDate = isFutureDate;
exports.isMarriageAfter18 = isMarriageAfter18;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
async function uidPlugin(fastify) {
    const prisma = new client_1.PrismaClient();
    fastify.decorate('uid', async (prefix, model) => {
        // @ts-ignore — because Prisma models are dynamic
        const lastRecord = await prisma[model].findFirst({
            orderBy: { id: 'desc' },
        });
        const nextId = lastRecord ? lastRecord.id + 1 : 1;
        console.log('last record: -', `${prefix}_${nextId}`);
        return `${prefix}_${nextId}`; // ✅ results in something like CRS_101
    });
}
function generateOrderId() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = crypto_1.default.randomBytes(4).toString("hex").toUpperCase();
    return `ORD_${date}_${random}`;
}
function generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `TXN_${timestamp}_${random}`;
}
function isAtLeast18(date) {
    const today = new Date();
    let age = today.getUTCFullYear() - date.getUTCFullYear();
    const hasHadBirthdayThisYear = today.getUTCMonth() > date.getUTCMonth() ||
        (today.getUTCMonth() === date.getUTCMonth() &&
            today.getUTCDate() >= date.getUTCDate());
    if (!hasHadBirthdayThisYear) {
        age--;
    }
    return age >= 18;
}
function isFutureDate(date) {
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    return date.getTime() > todayUTC.getTime();
}
function isMarriageAfter18(dob, dom) {
    // Minimum allowed marriage date = DOB + 18 years
    const minMarriageDate = new Date(Date.UTC(dob.getUTCFullYear() + 18, dob.getUTCMonth(), dob.getUTCDate()));
    return dom.getTime() >= minMarriageDate.getTime();
}
exports.default = (0, fastify_plugin_1.default)(uidPlugin, { name: 'uidPlugin' });
//# sourceMappingURL=uuidPlugin.js.map