"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMedia = getMedia;
exports.getMediaByuuid = getMediaByuuid;
exports.getMediaById = getMediaById;
exports.createMedia = createMedia;
exports.updateMedia = updateMedia;
exports.search = search;
const client_1 = __importDefault(require("../prisma/client"));
const storageService_1 = require("./storageService");
async function getMedia() {
    return client_1.default.mediaResource.findMany({
        orderBy: { created_at: 'desc' },
    });
}
async function getMediaByuuid(uuid) {
    return await client_1.default.mediaResource.findUnique({ where: { uuid } });
}
async function getMediaById(id) {
    return await client_1.default.mediaResource.findUnique({
        where: {
            id: Number(id) // ✅ Convert to number
        }
    });
}
async function createMedia(data) {
    return client_1.default.mediaResource.create({ data });
}
async function updateMedia(uuid, data) {
    const existing = await client_1.default.mediaResource.findUnique({ where: { uuid } });
    if (!existing)
        throw new Error('Media resource not found');
    const { thumbnail, url } = data;
    const tasks = [];
    if (thumbnail && existing.thumbnail && existing.thumbnail !== thumbnail) {
        tasks.push(storageService_1.storageService.deleteFile(existing.thumbnail));
    }
    if (url && existing.url && existing.url !== url) {
        tasks.push(storageService_1.storageService.deleteFile(existing.url));
    }
    if (tasks.length)
        await Promise.all(tasks);
    return client_1.default.mediaResource.update({ where: { uuid }, data });
}
async function search(params) {
    const { query, type, mimeType } = params;
    return client_1.default.mediaResource.findMany({
        where: {
            isActive: true,
            AND: [
                query ? { title: { contains: query } } : {},
                type ? { type } : {},
                mimeType ? { mimeType } : {},
            ],
        },
        take: 50, // limit results
        orderBy: { created_at: 'desc' },
    });
}
//# sourceMappingURL=mediaService.js.map