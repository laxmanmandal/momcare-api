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
async function getDietchart() {
    return client_1.default.dietChart.findMany({
        include: {
            week: { select: { name: true } }
        }
    });
}
// Diet chart 
async function getDietChartById(id) {
    return await client_1.default.dietChart.findUnique({
        where: { id },
    });
}
async function getDietChartByWeekId(weekId) {
    return await client_1.default.dietChart.findMany({
        where: { weekId },
    });
}
async function createDietchart(data) {
    return client_1.default.dietChart.create({ data });
}
async function updateDietchart(id, data) {
    const existing = await client_1.default.dietChart.findUnique({ where: { id } });
    if (!existing)
        throw new Error('Diet Chart resourse not found');
    if (data.icon && existing.icon && existing.icon !== data.icon) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.icon);
    }
    return client_1.default.dietChart.update({ where: { id }, data });
}
async function DietchartStatus(id) {
    const tips = await client_1.default.dietChart.findUnique({ where: { id } });
    if (!tips)
        throw new Error("Diet Chart not found");
    return client_1.default.dietChart.update({
        where: { id },
        data: { isActive: !tips.isActive },
    });
}
// dadi nani k nuskhe 
async function getDadiNaniNuskhe() {
    return client_1.default.dadiNaniNuskha.findMany({
        select: {
            id: true,
            creator: true,
            category: true,
            heading: true,
            subheading: true,
            content: true,
            icon: true,
            created_at: true,
            updated_at: true,
        }
    });
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
        throw new Error('Dadi Nani Nuskhe not found');
    if (data.icon && existing.icon && existing.icon !== data.icon) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.icon);
    }
    return client_1.default.dadiNaniNuskha.update({ where: { id }, data });
}
async function NuskheStatus(id) {
    const tips = await client_1.default.dadiNaniNuskha.findUnique({ where: { id } });
    if (!tips)
        throw new Error("Dadi Nani Nuskhe not found");
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
        throw new Error('week Not Found');
    return client_1.default.weekTable.update({ where: { id }, data });
}
//# sourceMappingURL=dietNuskhaToolService.js.map