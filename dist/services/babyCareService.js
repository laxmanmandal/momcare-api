"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeBabyData = serializeBabyData;
exports.getBabyProfiles = getBabyProfiles;
exports.getBabyProfilesByUserId = getBabyProfilesByUserId;
exports.getBabyProfileById = getBabyProfileById;
exports.createBabyProfile = createBabyProfile;
exports.updateBabyProfile = updateBabyProfile;
exports.deleteBabyProfile = deleteBabyProfile;
exports.createVaccinationLog = createVaccinationLog;
exports.getVaccinationLogsByBabyId = getVaccinationLogsByBabyId;
exports.getVaccinationLogById = getVaccinationLogById;
exports.updateVaccinationLog = updateVaccinationLog;
exports.deleteVaccinationLog = deleteVaccinationLog;
exports.createMotorSkillLog = createMotorSkillLog;
exports.getMotorSkillLogsByBabyId = getMotorSkillLogsByBabyId;
exports.getMotorSkillLogById = getMotorSkillLogById;
exports.updateMotorSkillLog = updateMotorSkillLog;
exports.deleteMotorSkillLog = deleteMotorSkillLog;
exports.createNutritionLog = createNutritionLog;
exports.getNutritionLogsByBabyId = getNutritionLogsByBabyId;
exports.getNutritionLogById = getNutritionLogById;
exports.updateNutritionLog = updateNutritionLog;
exports.deleteNutritionLog = deleteNutritionLog;
exports.createSleepLog = createSleepLog;
exports.getSleepLogsByBabyId = getSleepLogsByBabyId;
exports.getSleepLogById = getSleepLogById;
exports.updateSleepLog = updateSleepLog;
exports.deleteSleepLog = deleteSleepLog;
exports.createFeedLog = createFeedLog;
exports.getFeedLogsByBabyId = getFeedLogsByBabyId;
exports.getFeedLogById = getFeedLogById;
exports.updateFeedLog = updateFeedLog;
exports.deleteFeedLog = deleteFeedLog;
const client_1 = __importDefault(require("../prisma/client"));
const babyProfileInclude = {
    user: {
        select: {
            uuid: true,
        },
    },
    _count: {
        select: {
            vaccinations: true,
            sleepLogs: true,
            feedLogs: true,
            milestones: true,
            nutritionLogs: true,
        },
    },
};
function serializeBabyData(data) {
    return JSON.parse(JSON.stringify(data, (_key, value) => typeof value === "bigint" ? value.toString() : value));
}
async function getBabyProfiles(query = {}) {
    const where = buildBabyProfileWhere(query);
    return getPaginatedBabyProfiles(where, query);
}
async function getBabyProfilesByUserId(userId, query = {}) {
    const where = buildBabyProfileWhere({ ...query, userId });
    return getPaginatedBabyProfiles(where, query);
}
async function getBabyProfileById(id) {
    const data = await client_1.default.babyProfile.findUnique({
        where: { id },
        include: {
            ...babyProfileInclude,
            vaccinations: { orderBy: { createdAt: "desc" } },
            sleepLogs: { orderBy: { createdAt: "desc" } },
            feedLogs: { orderBy: { createdAt: "desc" } },
            milestones: { orderBy: { createdAt: "desc" } },
            nutritionLogs: { orderBy: { createdAt: "desc" } },
        },
    });
    return serializeBabyData(data);
}
async function createBabyProfile(data) {
    const profile = await client_1.default.babyProfile.create({ data });
    return serializeBabyData(profile);
}
async function updateBabyProfile(id, data) {
    await ensureBabyProfileExists(id);
    const profile = await client_1.default.babyProfile.update({
        where: { id },
        data,
    });
    return serializeBabyData(profile);
}
async function deleteBabyProfile(id) {
    await ensureBabyProfileExists(id);
    const profile = await client_1.default.babyProfile.delete({ where: { id } });
    return serializeBabyData(profile);
}
async function createVaccinationLog(data) {
    return createBabyLog("vaccinationLog", data);
}
async function getVaccinationLogsByBabyId(babyId, query = {}) {
    return getBabyLogs("vaccinationLog", babyId, { createdAt: "desc" }, query);
}
async function getVaccinationLogById(id) {
    return getBabyLogById("vaccinationLog", id);
}
async function updateVaccinationLog(id, data) {
    return updateBabyLog("vaccinationLog", id, data);
}
async function deleteVaccinationLog(id) {
    return deleteBabyLog("vaccinationLog", id);
}
async function createMotorSkillLog(data) {
    return createBabyLog("motorSkillLog", data);
}
async function getMotorSkillLogsByBabyId(babyId, query = {}) {
    return getBabyLogs("motorSkillLog", babyId, { createdAt: "desc" }, query);
}
async function getMotorSkillLogById(id) {
    return getBabyLogById("motorSkillLog", id);
}
async function updateMotorSkillLog(id, data) {
    return updateBabyLog("motorSkillLog", id, data);
}
async function deleteMotorSkillLog(id) {
    return deleteBabyLog("motorSkillLog", id);
}
async function createNutritionLog(data) {
    return createBabyLog("nutritionLog", data);
}
async function getNutritionLogsByBabyId(babyId, query = {}) {
    return getBabyLogs("nutritionLog", babyId, { createdAt: "desc" }, query);
}
async function getNutritionLogById(id) {
    return getBabyLogById("nutritionLog", id);
}
async function updateNutritionLog(id, data) {
    return updateBabyLog("nutritionLog", id, data);
}
async function deleteNutritionLog(id) {
    return deleteBabyLog("nutritionLog", id);
}
async function createSleepLog(data) {
    return createBabyLog("sleepLog", data);
}
async function getSleepLogsByBabyId(babyId, query = {}) {
    return getBabyLogs("sleepLog", babyId, { sleepStart: "desc" }, query);
}
async function getSleepLogById(id) {
    return getBabyLogById("sleepLog", id);
}
async function updateSleepLog(id, data) {
    return updateBabyLog("sleepLog", id, data);
}
async function deleteSleepLog(id) {
    return deleteBabyLog("sleepLog", id);
}
async function createFeedLog(data) {
    return createBabyLog("feedLog", data);
}
async function getFeedLogsByBabyId(babyId, query = {}) {
    return getBabyLogs("feedLog", babyId, { feedingTime: "desc" }, query);
}
async function getFeedLogById(id) {
    return getBabyLogById("feedLog", id);
}
async function updateFeedLog(id, data) {
    return updateBabyLog("feedLog", id, data);
}
async function deleteFeedLog(id) {
    return deleteBabyLog("feedLog", id);
}
async function ensureBabyProfileExists(id) {
    const baby = await client_1.default.babyProfile.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!baby) {
        throw new Error("Baby profile not found");
    }
}
function model(modelName) {
    return client_1.default[modelName];
}
function normalizePagination(query) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    return { page, limit, skip: (page - 1) * limit };
}
function numericSearch(search) {
    if (!search || !/^[0-9]+$/.test(search))
        return undefined;
    try {
        return BigInt(search);
    }
    catch {
        return undefined;
    }
}
function buildBabyProfileWhere(query) {
    const where = {};
    const idSearch = numericSearch(query.search);
    if (query.userId)
        where.userId = query.userId;
    if (query.search) {
        where.OR = [
            ...(idSearch ? [{ id: idSearch }] : []),
            { babyName: { contains: query.search } },
            { gender: { contains: query.search } },
            { bloodGroup: { contains: query.search } },
            { user: { uuid: { contains: query.search } } },
        ];
    }
    return where;
}
async function getPaginatedBabyProfiles(where, query) {
    const { page, limit, skip } = normalizePagination(query);
    const allowedSortFields = [
        "id",
        "userId",
        "babyName",
        "gender",
        "dob",
        "bloodGroup",
        "birthWeight",
        "birthHeight",
        "createdAt",
        "updatedAt",
    ];
    const sortField = query.sortField && allowedSortFields.includes(query.sortField)
        ? query.sortField
        : "id";
    const orderBy = { [sortField]: query.sortOrder ?? "desc" };
    const [data, total] = await client_1.default.$transaction([
        client_1.default.babyProfile.findMany({
            where,
            include: babyProfileInclude,
            orderBy,
            skip,
            take: limit,
        }),
        client_1.default.babyProfile.count({ where }),
    ]);
    return serializeBabyData({
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    });
}
async function createBabyLog(modelName, data) {
    await ensureBabyProfileExists(data.babyId);
    const log = await model(modelName).create({ data });
    return serializeBabyData(log);
}
async function getBabyLogs(modelName, babyId, orderBy, query = {}) {
    await ensureBabyProfileExists(babyId);
    const { page, limit, skip } = normalizePagination(query);
    const where = buildBabyLogWhere(modelName, babyId, query.search);
    const resolvedOrderBy = buildBabyLogOrderBy(modelName, query, orderBy);
    const [data, total] = await client_1.default.$transaction([
        model(modelName).findMany({
            where,
            orderBy: resolvedOrderBy,
            skip,
            take: limit,
        }),
        model(modelName).count({ where }),
    ]);
    return serializeBabyData({
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    });
}
function buildBabyLogWhere(modelName, babyId, search) {
    const where = { babyId };
    const idSearch = numericSearch(search);
    if (search) {
        const searchableFields = {
            vaccinationLog: ["week", "status"],
            motorSkillLog: ["week", "status"],
            nutritionLog: ["week", "mealType"],
            sleepLog: ["week", "notes"],
            feedLog: ["quantity", "notes"],
        };
        where.OR = [
            ...(idSearch ? [{ id: idSearch }] : []),
            ...searchableFields[modelName].map((field) => ({ [field]: { contains: search } })),
            ...(modelName === "feedLog" && ["BREAST_MILK", "FORMULA_MILK", "SOLID_FOOD", "WATER"].includes(search)
                ? [{ feedType: search }]
                : []),
        ];
    }
    return where;
}
function buildBabyLogOrderBy(modelName, query, defaultOrderBy) {
    const allowedSortFields = {
        vaccinationLog: ["id", "babyId", "week", "doseNumber", "takenDate", "status", "createdAt"],
        motorSkillLog: ["id", "babyId", "week", "status", "achievedDate", "skillNo", "createdAt"],
        nutritionLog: ["id", "babyId", "week", "mealType", "nutritionNo", "createdAt"],
        sleepLog: ["id", "babyId", "week", "sleepStart", "sleepEnd", "durationMinutes", "notes", "createdAt"],
        feedLog: ["id", "babyId", "feedType", "quantity", "feedingTime", "durationMinutes", "createdAt"],
    };
    return query.sortField && allowedSortFields[modelName].includes(query.sortField)
        ? { [query.sortField]: query.sortOrder ?? "asc" }
        : defaultOrderBy;
}
async function getBabyLogById(modelName, id) {
    const log = await model(modelName).findUnique({ where: { id } });
    return serializeBabyData(log);
}
async function updateBabyLog(modelName, id, data) {
    const existing = await model(modelName).findUnique({
        where: { id },
        select: { id: true },
    });
    if (!existing) {
        throw new Error("Baby log not found");
    }
    if (data.babyId) {
        await ensureBabyProfileExists(data.babyId);
    }
    const log = await model(modelName).update({
        where: { id },
        data,
    });
    return serializeBabyData(log);
}
async function deleteBabyLog(modelName, id) {
    const log = await model(modelName).delete({ where: { id } });
    return serializeBabyData(log);
}
//# sourceMappingURL=babyCareService.js.map