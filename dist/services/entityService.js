"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.creatEntityTable = creatEntityTable;
exports.getPartnerEntity = getPartnerEntity;
exports.getChannelEntity = getChannelEntity;
exports.getAllentities = getAllentities;
exports.getentityTableById = getentityTableById;
exports.updateEntityTable = updateEntityTable;
const client_1 = __importDefault(require("../prisma/client"));
const fileUploads_1 = require("../utils/fileUploads");
// entityTables
async function creatEntityTable(data) {
    console.log({
        name: data.name,
        type: data.type,
        email: data.email,
        phone: data.phone,
        location: data.location,
        description: data.description,
        imageUrl: data.imageUrl ?? null,
        isActive: data.isActive ?? true,
        belongsToId: data.belongsToId ?? null,
        createdBy: data.createdBy || undefined,
    });
    return await client_1.default.entityTable.create({
        data: {
            name: data.name,
            type: data.type,
            email: data.email,
            phone: data.phone,
            location: data.location,
            description: data.description,
            imageUrl: data.imageUrl ?? null,
            isActive: data.isActive ?? true,
            belongsToId: data.belongsToId ?? null,
            createdBy: data.createdBy || undefined,
        },
    });
}
// Partners
async function getPartnerEntity(id) {
    return client_1.default.entityTable.findMany({
        where: { belongsToId: id, type: 'Partner' },
        include: {
            createdByUser: { select: { id: true, name: true } },
            belongsToEntity: { select: { id: true, name: true } },
            users: true
        }
    });
}
// channel
async function getChannelEntity(id) {
    return client_1.default.entityTable.findMany({
        where: { belongsToId: id, type: 'Channel' },
        include: {
            createdByUser: { select: { id: true, name: true } },
            belongsToEntity: { select: { id: true, name: true } },
            users: true
        }
    });
}
async function getAllentities(id) {
    return client_1.default.entityTable.findMany({
        where: { belongsToId: id },
        include: {
            createdByUser: { select: { id: true, name: true } },
            belongsToEntity: { select: { id: true, name: true } },
            users: true
        }
    });
}
async function getentityTableById(id) {
    const user = await client_1.default.entityTable.findUnique({
        where: { id }, include: {
            createdByUser: { select: { id: true, name: true } },
            belongsToEntity: { select: { id: true, name: true } },
            users: true
        }
    });
    if (!user)
        throw new Error('entityTable not found');
    return user;
}
async function updateEntityTable(id, data) {
    const existing = await client_1.default.entityTable.findUnique({ where: { id } });
    if (!existing) {
        throw { statusCode: 404, message: 'entityTable not found' };
    }
    if (data.imageUrl && existing.imageUrl && existing.imageUrl !== data.imageUrl) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.imageUrl);
    }
    return await client_1.default.entityTable.update({
        where: { id },
        data: {
            name: data.name ?? existing.name,
            type: data.type ?? existing.type,
            email: data.email ?? existing.email,
            phone: data.phone ?? existing.phone,
            location: data.location ?? existing.location,
            description: data.description ?? existing.description,
            imageUrl: data.imageUrl ?? existing.imageUrl,
            isActive: data.isActive === undefined ? existing.isActive : Boolean(data.isActive)
        },
    });
}
//# sourceMappingURL=entityService.js.map