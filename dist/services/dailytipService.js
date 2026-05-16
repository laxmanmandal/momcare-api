"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getdailyTips = getdailyTips;
exports.getAllDailyTips = getAllDailyTips;
exports.getdailyTipsById = getdailyTipsById;
exports.createdailyTips = createdailyTips;
exports.updatedailyTips = updatedailyTips;
exports.dailyTipsStatus = dailyTipsStatus;
const client_1 = __importDefault(require("../prisma/client"));
const fileUploads_1 = require("../utils/fileUploads");
const http_errors_1 = require("http-errors");
function buildDailyTipWhere(query) {
    const where = {};
    if (query.search) {
        where.OR = [
            { heading: { contains: query.search } },
            { subheading: { contains: query.search } },
            { content: { contains: query.search } },
            { creator: { contains: query.search } },
        ];
    }
    if (query.category)
        where.category = query.category;
    if (query.isActive !== undefined)
        where.isActive = query.isActive;
    return where;
}
function normalizeJsonContent(value) {
    if (value === undefined)
        return undefined;
    if (typeof value !== 'string')
        return JSON.stringify(value);
    const trimmed = value.trim();
    if (!trimmed)
        return JSON.stringify('');
    try {
        return JSON.stringify(JSON.parse(trimmed));
    }
    catch {
        return JSON.stringify(value);
    }
}
function normalizeDailyTipPayload(data) {
    if (data?.content === undefined)
        return data;
    return {
        ...data,
        content: normalizeJsonContent(data.content),
    };
}
async function getdailyTips(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;
    const where = buildDailyTipWhere(query);
    const sortField = query.sortField ?? 'created_at';
    const sortOrder = query.sortOrder ?? 'desc';
    const [data, total] = await client_1.default.$transaction([
        client_1.default.dailyTip.findMany({
            where,
            select: {
                id: true,
                creator: true,
                heading: true,
                subheading: true,
                content: true,
                category: true,
                isActive: true,
                icon: true,
                created_at: true,
                updated_at: true,
            },
            orderBy: {
                [sortField]: sortOrder,
            },
            skip,
            take: limit,
        }),
        client_1.default.dailyTip.count({ where }),
    ]);
    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}
async function getAllDailyTips() {
    return client_1.default.dailyTip.findMany({
        select: {
            id: true,
            creator: true,
            heading: true,
            subheading: true,
            content: true,
            category: true,
            isActive: true,
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
    return client_1.default.dailyTip.create({ data: normalizeDailyTipPayload(data) });
}
async function updatedailyTips(id, data) {
    const existing = await client_1.default.dailyTip.findUnique({ where: { id } });
    if (!existing)
        throw new http_errors_1.BadRequest('Daily Tips resource not found');
    if (data.icon && existing.icon && existing.icon !== data.icon) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.icon);
    }
    return client_1.default.dailyTip.update({ where: { id }, data: normalizeDailyTipPayload(data) });
}
async function dailyTipsStatus(id) {
    const tips = await client_1.default.dailyTip.findUnique({ where: { id } });
    if (!tips)
        throw new http_errors_1.BadRequest("Daily Tips not found");
    return client_1.default.dailyTip.update({
        where: { id },
        data: { isActive: !tips.isActive },
    });
}
//# sourceMappingURL=dailytipService.js.map