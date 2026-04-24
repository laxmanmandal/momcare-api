"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSymptomEntry = addSymptomEntry;
exports.getUniqueSymptomsLastNDays = getUniqueSymptomsLastNDays;
const client_1 = __importDefault(require("../prisma/client"));
/**
 * Create a symptom entry
 * @param userId number
 * @param symptoms string[]  (array of symptom strings)
 */
async function addSymptomEntry(userId, symptoms) {
    if (!Array.isArray(symptoms)) {
        throw new Error('symptoms must be an array of strings');
    }
    const cleaned = symptoms
        .map(s => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean);
    console.log(cleaned);
    const entry = await client_1.default.symptomEntry.create({
        data: {
            userId,
            symptoms: symptoms, // stored as JSON
        },
    });
    return entry;
}
/**
 * Get unique symptom strings for last `days` days (default 30).
 */
async function getUniqueSymptomsLastNDays(days = 30) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    // normalize to start of day and end of day for inclusive range
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const rows = await client_1.default.symptomEntry.findMany({
        where: {
            created_at: {
                gte: start,
                lte: end,
            },
        },
        select: {
            symptoms: true,
        },
    });
    const uniqueSet = new Set();
    for (const r of rows) {
        const s = r.symptoms;
        if (!s)
            continue;
        if (Array.isArray(s)) {
            for (const v of s) {
                if (typeof v === 'string' && v.trim()) {
                    const split = v.split(',').map(x => x.trim()).filter(Boolean);
                    split.forEach(item => uniqueSet.add(item));
                }
            }
        }
        else if (typeof s === 'string') {
            const split = s.split(',').map(x => x.trim()).filter(Boolean);
            split.forEach(item => uniqueSet.add(item));
        }
    }
    const arr = Array.from(uniqueSet);
    return { uniqueSymptoms: arr, count: arr.length };
}
//# sourceMappingURL=healthService.js.map