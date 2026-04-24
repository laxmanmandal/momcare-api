"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getexperts = getexperts;
exports.getexpertsById = getexpertsById;
exports.createExperts = createExperts;
exports.updateexperts = updateexperts;
const client_1 = __importDefault(require("../prisma/client"));
const fileUploads_1 = require("../utils/fileUploads");
async function getexperts() {
    return client_1.default.expert.findMany({
        include: {
            Professions: true,
        }, orderBy: {
            id: 'desc',
        },
    });
}
async function getexpertsById(id) {
    return await client_1.default.expert.findUnique({
        where: { id }, include: {
            Professions: true,
        }
    });
}
async function createExperts(data) {
    return client_1.default.expert.create({ data });
}
async function updateexperts(id, data) {
    const existing = await client_1.default.expert.findUnique({ where: { id } });
    if (!existing)
        throw new Error('Expert not found');
    if (data.image && existing.image && existing.image !== data.image) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.image);
    }
    return client_1.default.expert.update({ where: { id }, data });
}
//# sourceMappingURL=expertService.js.map