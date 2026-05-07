import type { Prisma } from "@prisma/client";
import prisma from "../prisma/client";

type BabyLogModel =
  | "vaccinationLog"
  | "motorSkillLog"
  | "nutritionLog"
  | "sleepLog"
  | "feedLog";

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

export function serializeBabyData<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
}

export async function getBabyProfiles() {
  const data = await prisma.babyProfile.findMany({
    include: babyProfileInclude,
    orderBy: { id: "desc" },
  });

  return serializeBabyData(data);
}

export async function getBabyProfilesByUserId(userId: number) {
  const data = await prisma.babyProfile.findMany({
    where: { userId },
    include: babyProfileInclude,
    orderBy: { id: "desc" },
  });

  return serializeBabyData(data);
}

export async function getBabyProfileById(id: bigint) {
  const data = await prisma.babyProfile.findUnique({
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

export async function createBabyProfile(data: Prisma.BabyProfileUncheckedCreateInput) {
  const profile = await prisma.babyProfile.create({ data });
  return serializeBabyData(profile);
}

export async function updateBabyProfile(id: bigint, data: Prisma.BabyProfileUncheckedUpdateInput) {
  await ensureBabyProfileExists(id);

  const profile = await prisma.babyProfile.update({
    where: { id },
    data,
  });

  return serializeBabyData(profile);
}

export async function deleteBabyProfile(id: bigint) {
  await ensureBabyProfileExists(id);

  const profile = await prisma.babyProfile.delete({ where: { id } });
  return serializeBabyData(profile);
}

export async function createVaccinationLog(data: Prisma.VaccinationLogUncheckedCreateInput) {
  return createBabyLog("vaccinationLog", data);
}

export async function getVaccinationLogsByBabyId(babyId: bigint) {
  return getBabyLogs("vaccinationLog", babyId, { dueDate: "asc" });
}

export async function getVaccinationLogById(id: bigint) {
  return getBabyLogById("vaccinationLog", id);
}

export async function updateVaccinationLog(id: bigint, data: Prisma.VaccinationLogUncheckedUpdateInput) {
  return updateBabyLog("vaccinationLog", id, data);
}

export async function deleteVaccinationLog(id: bigint) {
  return deleteBabyLog("vaccinationLog", id);
}

export async function createMotorSkillLog(data: Prisma.MotorSkillLogUncheckedCreateInput) {
  return createBabyLog("motorSkillLog", data);
}

export async function getMotorSkillLogsByBabyId(babyId: bigint) {
  return getBabyLogs("motorSkillLog", babyId, { createdAt: "desc" });
}

export async function getMotorSkillLogById(id: bigint) {
  return getBabyLogById("motorSkillLog", id);
}

export async function updateMotorSkillLog(id: bigint, data: Prisma.MotorSkillLogUncheckedUpdateInput) {
  return updateBabyLog("motorSkillLog", id, data);
}

export async function deleteMotorSkillLog(id: bigint) {
  return deleteBabyLog("motorSkillLog", id);
}

export async function createNutritionLog(data: Prisma.NutritionLogUncheckedCreateInput) {
  return createBabyLog("nutritionLog", data);
}

export async function getNutritionLogsByBabyId(babyId: bigint) {
  return getBabyLogs("nutritionLog", babyId, { feedingTime: "desc" });
}

export async function getNutritionLogById(id: bigint) {
  return getBabyLogById("nutritionLog", id);
}

export async function updateNutritionLog(id: bigint, data: Prisma.NutritionLogUncheckedUpdateInput) {
  return updateBabyLog("nutritionLog", id, data);
}

export async function deleteNutritionLog(id: bigint) {
  return deleteBabyLog("nutritionLog", id);
}

export async function createSleepLog(data: Prisma.SleepLogUncheckedCreateInput) {
  return createBabyLog("sleepLog", data);
}

export async function getSleepLogsByBabyId(babyId: bigint) {
  return getBabyLogs("sleepLog", babyId, { sleepStart: "desc" });
}

export async function getSleepLogById(id: bigint) {
  return getBabyLogById("sleepLog", id);
}

export async function updateSleepLog(id: bigint, data: Prisma.SleepLogUncheckedUpdateInput) {
  return updateBabyLog("sleepLog", id, data);
}

export async function deleteSleepLog(id: bigint) {
  return deleteBabyLog("sleepLog", id);
}

export async function createFeedLog(data: Prisma.FeedLogUncheckedCreateInput) {
  return createBabyLog("feedLog", data);
}

export async function getFeedLogsByBabyId(babyId: bigint) {
  return getBabyLogs("feedLog", babyId, { feedingTime: "desc" });
}

export async function getFeedLogById(id: bigint) {
  return getBabyLogById("feedLog", id);
}

export async function updateFeedLog(id: bigint, data: Prisma.FeedLogUncheckedUpdateInput) {
  return updateBabyLog("feedLog", id, data);
}

export async function deleteFeedLog(id: bigint) {
  return deleteBabyLog("feedLog", id);
}

async function ensureBabyProfileExists(id: bigint) {
  const baby = await prisma.babyProfile.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!baby) {
    throw new Error("Baby profile not found");
  }
}

function model(modelName: BabyLogModel) {
  return prisma[modelName] as any;
}

async function createBabyLog(modelName: BabyLogModel, data: Record<string, unknown>) {
  await ensureBabyProfileExists(data.babyId as bigint);
  const log = await model(modelName).create({ data });
  return serializeBabyData(log);
}

async function getBabyLogs(
  modelName: BabyLogModel,
  babyId: bigint,
  orderBy: Record<string, "asc" | "desc">,
) {
  await ensureBabyProfileExists(babyId);

  const logs = await model(modelName).findMany({
    where: { babyId },
    orderBy,
  });

  return serializeBabyData(logs);
}

async function getBabyLogById(modelName: BabyLogModel, id: bigint) {
  const log = await model(modelName).findUnique({ where: { id } });
  return serializeBabyData(log);
}

async function updateBabyLog(modelName: BabyLogModel, id: bigint, data: Record<string, unknown>) {
  const existing = await model(modelName).findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Baby log not found");
  }

  if (data.babyId) {
    await ensureBabyProfileExists(data.babyId as bigint);
  }

  const log = await model(modelName).update({
    where: { id },
    data,
  });

  return serializeBabyData(log);
}

async function deleteBabyLog(modelName: BabyLogModel, id: bigint) {
  const log = await model(modelName).delete({ where: { id } });
  return serializeBabyData(log);
}
