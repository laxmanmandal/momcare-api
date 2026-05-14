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
function parseStoredList(value) {
    if (!value)
        return [];
    if (Array.isArray(value))
        return value;
    try {
        const parsed = JSON.parse(String(value));
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return String(value)
            .split(/\r?\n|,/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
}
function normalizeList(value, splitCommas = false) {
    if (value === undefined)
        return undefined;
    if (value === null)
        return JSON.stringify([]);
    if (Array.isArray(value))
        return JSON.stringify(value);
    const raw = String(value).trim();
    if (!raw)
        return JSON.stringify([]);
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed))
            return JSON.stringify(parsed);
    }
    catch { }
    const splitter = splitCommas ? /\r?\n|,/ : /\r?\n/;
    return JSON.stringify(raw
        .split(splitter)
        .map((item) => item.trim())
        .filter(Boolean));
}
function normalizeExpertPayload(data) {
    const payload = { ...data };
    if (payload.certifications !== undefined) {
        payload.certifications = normalizeList(payload.certifications);
    }
    if (payload.availability !== undefined) {
        payload.availability = normalizeList(payload.availability);
    }
    if (payload.languages !== undefined) {
        payload.languages = normalizeList(payload.languages, true);
    }
    return payload;
}
function serializeExpert(expert) {
    if (!expert)
        return expert;
    return {
        ...expert,
        certifications: parseStoredList(expert.certifications),
        availability: parseStoredList(expert.availability),
        languages: parseStoredList(expert.languages),
    };
}
async function getexperts() {
    const experts = await client_1.default.expert.findMany({
        include: {
            Professions: true,
        }, orderBy: {
            id: 'desc',
        },
    });
    return experts.map(serializeExpert);
}
async function getexpertsById(id) {
    const expert = await client_1.default.expert.findUnique({
        where: { id }, include: {
            Professions: true,
        }
    });
    return serializeExpert(expert);
}
async function createExperts(data) {
    const expert = await client_1.default.expert.create({ data: normalizeExpertPayload(data) });
    return serializeExpert(expert);
}
async function updateexperts(id, data) {
    const existing = await client_1.default.expert.findUnique({ where: { id } });
    if (!existing)
        throw new Error('Expert not found');
    if (data.image && existing.image && existing.image !== data.image) {
        await (0, fileUploads_1.deleteFileIfExists)(existing.image);
    }
    const expert = await client_1.default.expert.update({ where: { id }, data: normalizeExpertPayload(data) });
    return serializeExpert(expert);
}
//# sourceMappingURL=expertService.js.map