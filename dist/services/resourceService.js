"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConceive = getConceive;
exports.getConceiveById = getConceiveById;
exports.createConceive = createConceive;
exports.updateConceive = updateConceive;
const client_1 = __importDefault(require("../prisma/client"));
const fileUploads_1 = require("../utils/fileUploads");
async function getConceive(type) {
    return client_1.default.concieve.findMany({
        select: {
            id: true,
            week: true,
            title: true,
            subtitle: true,
            type: true,
            description: true,
            thumbnail: true,
            image: true,
            height: true,
            weight: true,
            created_at: true,
            updated_at: true,
        },
        where: { type },
        take: 50,
        orderBy: { created_at: 'desc' }
    });
}
async function getConceiveById(id) {
    return await client_1.default.concieve.findUnique({ where: { id } });
}
async function createConceive(data) {
    return client_1.default.concieve.create({ data });
}
async function updateConceive(id, data) {
    const existing = await client_1.default.concieve.findUnique({ where: { id } });
    if (!existing)
        throw new Error('trying to conceive resourse not found');
    if (data.thumbnail && existing.thumbnail && existing.thumbnail !== data.thumbnail) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.thumbnail);
    }
    if (data.image && existing.image && existing.image !== data.image) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.image);
    }
    return client_1.default.concieve.update({ where: { id }, data });
}
//# sourceMappingURL=resourceService.js.map