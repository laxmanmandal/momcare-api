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
async function getBabyProfiles() {
    const data = await client_1.default.babyProfile.findMany({
        include: babyProfileInclude,
        orderBy: { id: "desc" },
    });
    return serializeBabyData(data);
}
async function getBabyProfilesByUserId(userId) {
    const data = await client_1.default.babyProfile.findMany({
        where: { userId },
        include: babyProfileInclude,
        orderBy: { id: "desc" },
    });
    return serializeBabyData(data);
}
async function getBabyProfileById(id) {
    const data = await client_1.default.babyProfile.findUnique({
        where: { id },
        include: {
            ...babyProfileInclude,
            vaccinations: { orderBy: { dueDate: "asc" } },
            sleepLogs: { orderBy: { sleepStart: "desc" } },
            feedLogs: { orderBy: { feedingTime: "desc" } },
            milestones: { orderBy: { createdAt: "desc" } },
            nutritionLogs: { orderBy: { feedingTime: "desc" } },
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
async function getVaccinationLogsByBabyId(babyId) {
    return getBabyLogs("vaccinationLog", babyId, { dueDate: "asc" });
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
async function getMotorSkillLogsByBabyId(babyId) {
    return getBabyLogs("motorSkillLog", babyId, { createdAt: "desc" });
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
async function getNutritionLogsByBabyId(babyId) {
    return getBabyLogs("nutritionLog", babyId, { feedingTime: "desc" });
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
async function getSleepLogsByBabyId(babyId) {
    return getBabyLogs("sleepLog", babyId, { sleepStart: "desc" });
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
async function getFeedLogsByBabyId(babyId) {
    return getBabyLogs("feedLog", babyId, { feedingTime: "desc" });
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
async function createBabyLog(modelName, data) {
    await ensureBabyProfileExists(data.babyId);
    const log = await model(modelName).create({ data });
    return serializeBabyData(log);
}
async function getBabyLogs(modelName, babyId, orderBy) {
    await ensureBabyProfileExists(babyId);
    const logs = await model(modelName).findMany({
        where: { babyId },
        orderBy,
    });
    return serializeBabyData(logs);
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