"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDietchart = getDietchart;
exports.getDietChartById = getDietChartById;
exports.getDietChartByWeekId = getDietChartByWeekId;
exports.createDietchart = createDietchart;
exports.updateDietchart = updateDietchart;
exports.DietchartStatus = DietchartStatus;
exports.getDadiNaniNuskhe = getDadiNaniNuskhe;
exports.getNuskheById = getNuskheById;
exports.createNuskhe = createNuskhe;
exports.updateNuskhe = updateNuskhe;
exports.NuskheStatus = NuskheStatus;
exports.getWeeks = getWeeks;
exports.createWeek = createWeek;
exports.getWeekById = getWeekById;
exports.updateWeek = updateWeek;
const client_1 = __importDefault(require("../prisma/client"));
const fileUploads_1 = require("../utils/fileUploads");
const http_errors_1 = require("http-errors");
function buildContentToolWhere(query, options = {}) {
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
    if (options.includeWeek && query.weekId !== undefined)
        where.weekId = query.weekId;
    return where;
}
function paginationFrom(query) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    return { page, limit, skip: (page - 1) * limit };
}
async function getDietchart(query = {}) {
    const { page, limit, skip } = paginationFrom(query);
    const where = buildContentToolWhere(query, { includeWeek: true });
    const sortField = query.sortField ?? 'id';
    const sortOrder = query.sortOrder ?? 'asc';
    const [data, total] = await client_1.default.$transaction([
        client_1.default.dietChart.findMany({
            where,
            include: {
                week: { select: { name: true } }
            },
            orderBy: {
                [sortField]: sortOrder,
            },
            skip,
            take: limit,
        }),
        client_1.default.dietChart.count({ where }),
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
// Diet chart 
async function getDietChartById(id) {
    return await client_1.default.dietChart.findUnique({
        where: { id },
    });
}
async function getDietChartByWeekId(weekId, query = {}) {
    const { page, limit, skip } = paginationFrom(query);
    const where = buildContentToolWhere({ ...query, weekId }, { includeWeek: true });
    const sortField = query.sortField ?? 'id';
    const sortOrder = query.sortOrder ?? 'asc';
    const [data, total] = await client_1.default.$transaction([
        client_1.default.dietChart.findMany({
            where,
            include: {
                week: { select: { name: true } }
            },
            orderBy: {
                [sortField]: sortOrder,
            },
            skip,
            take: limit,
        }),
        client_1.default.dietChart.count({ where }),
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
async function createDietchart(data) {
    return client_1.default.dietChart.create({ data });
}
async function updateDietchart(id, data) {
    const existing = await client_1.default.dietChart.findUnique({ where: { id } });
    if (!existing)
        throw new http_errors_1.BadRequest('Diet Chart resource not found');
    if (data.icon && existing.icon && existing.icon !== data.icon) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.icon);
    }
    return client_1.default.dietChart.update({ where: { id }, data });
}
async function DietchartStatus(id) {
    const tips = await client_1.default.dietChart.findUnique({ where: { id } });
    if (!tips)
        throw new http_errors_1.BadRequest("Diet Chart not found");
    return client_1.default.dietChart.update({
        where: { id },
        data: { isActive: !tips.isActive },
    });
}
// dadi nani k nuskhe 
async function getDadiNaniNuskhe(query = {}) {
    const { page, limit, skip } = paginationFrom(query);
    const where = buildContentToolWhere(query);
    const sortField = query.sortField ?? 'id';
    const sortOrder = query.sortOrder ?? 'asc';
    const [data, total] = await client_1.default.$transaction([
        client_1.default.dadiNaniNuskha.findMany({
            where,
            select: {
                id: true,
                creator: true,
                category: true,
                heading: true,
                subheading: true,
                content: true,
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
        client_1.default.dadiNaniNuskha.count({ where }),
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
async function getNuskheById(id) {
    return await client_1.default.dadiNaniNuskha.findUnique({ where: { id } });
}
async function createNuskhe(data) {
    return client_1.default.dadiNaniNuskha.create({ data });
}
async function updateNuskhe(id, data) {
    const existing = await client_1.default.dadiNaniNuskha.findUnique({ where: { id } });
    if (!existing)
        throw new http_errors_1.BadRequest('Dadi Nani Nuskhe not found');
    if (data.icon && existing.icon && existing.icon !== data.icon) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.icon);
    }
    return client_1.default.dadiNaniNuskha.update({ where: { id }, data });
}
async function NuskheStatus(id) {
    const tips = await client_1.default.dadiNaniNuskha.findUnique({ where: { id } });
    if (!tips)
        throw new http_errors_1.BadRequest("Dadi Nani Nuskhe not found");
    return client_1.default.dadiNaniNuskha.update({
        where: { id },
        data: { isActive: !tips.isActive },
    });
}
async function getWeeks(order = 'asc') {
    return client_1.default.weekTable.findMany({
        orderBy: {
            order: order // assuming your column name is "order"
        }
    });
}
// Diet chart 
async function createWeek(data) {
    return client_1.default.weekTable.create({ data });
}
async function getWeekById(id) {
    return await client_1.default.weekTable.findUnique({ where: { id } });
}
async function updateWeek(id, data) {
    const existing = await client_1.default.weekTable.findUnique({ where: { id } });
    if (!existing)
        throw new http_errors_1.BadRequest('Week not found');
    return client_1.default.weekTable.update({ where: { id }, data });
}
//# sourceMappingURL=dietNuskhaToolService.js.map