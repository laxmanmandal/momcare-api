"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getdailyTips = getdailyTips;
exports.getdailyTipsById = getdailyTipsById;
exports.createdailyTips = createdailyTips;
exports.updatedailyTips = updatedailyTips;
exports.dailyTipsStatus = dailyTipsStatus;
const client_1 = __importDefault(require("../prisma/client"));
const fileUploads_1 = require("../utils/fileUploads");
async function getdailyTips() {
    return client_1.default.dailyTip.findMany({
        select: {
            id: true,
            creator: true,
            heading: true,
            subheading: true,
            content: true,
            category: true,
            icon: true,
            created_at: true,
            updated_at: true,
        },
        orderBy: {
            id: 'asc',
        },
    });
}
async function getdailyTipsById(id) {
    return await client_1.default.dailyTip.findUnique({ where: { id } });
}
async function createdailyTips(data) {
    return client_1.default.dailyTip.create({ data });
}
async function updatedailyTips(id, data) {
    const existing = await client_1.default.dailyTip.findUnique({ where: { id } });
    if (!existing)
        throw new Error('Daily Tips resourse not found');
    if (data.icon && existing.icon && existing.icon !== data.icon) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.icon);
    }
    return client_1.default.dailyTip.update({ where: { id }, data });
}
async function dailyTipsStatus(id) {
    const tips = await client_1.default.dailyTip.findUnique({ where: { id } });
    if (!tips)
        throw new Error("Daily Tips not found");
    return client_1.default.dailyTip.update({
        where: { id },
        data: { isActive: !tips.isActive },
    });
}
//# sourceMappingURL=dailytipService.js.map