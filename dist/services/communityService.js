"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommunity = getCommunity;
exports.getCommunityById = getCommunityById;
exports.createCommunity = createCommunity;
exports.updateCommunity = updateCommunity;
exports.CommunityStatus = CommunityStatus;
exports.handleCommunityJoin = handleCommunityJoin;
const client_1 = __importDefault(require("../prisma/client"));
const fileUploads_1 = require("../utils/fileUploads");
async function getCommunity() {
    return client_1.default.community.findMany({
        include: {
            _count: {
                select: {
                    posts: true,
                    members: true,
                }
            }
        }
    });
}
async function getCommunityById(id) {
    return await client_1.default.community.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    posts: true,
                    members: true,
                }
            }
        }
    });
}
async function createCommunity(data) {
    return client_1.default.community.create({ data });
}
async function updateCommunity(id, data) {
    const existing = await client_1.default.community.findUnique({ where: { id } });
    if (!existing)
        throw new Error('community not found');
    if (data.imageUrl && existing.imageUrl && existing.imageUrl !== data.imageUrl) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.imageUrl);
    }
    return client_1.default.community.update({ where: { id }, data });
}
async function CommunityStatus(id) {
    const tips = await client_1.default.community.findUnique({ where: { id } });
    if (!tips)
        throw new Error("Community not found");
    return client_1.default.community.update({
        where: { id },
        data: { isActive: !tips.isActive },
    });
}
async function handleCommunityJoin({ communityId, userId }) {
    const existing = await client_1.default.communityJoin.findFirst({
        where: { communityId, userId }
    });
    if (existing) {
        await client_1.default.communityJoin.delete({ where: { id: existing.id } });
        return {
            success: true,
            subscribed: false,
            message: "Unsubscribed from the community"
        };
    }
    const created = await client_1.default.communityJoin.create({
        data: { communityId, userId }
    });
    return {
        success: true,
        subscribed: true,
        message: "Subscribed to the community",
        data: created
    };
}
//# sourceMappingURL=communityService.js.map