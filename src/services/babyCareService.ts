import type { Prisma } from "@prisma/client";
import prisma from "../prisma/client";

type BabyLogModel =
  | "vaccinationLog"
  | "motorSkillLog"
  | "nutritionLog"
  | "sleepLog"
  | "feedLog";

type SortOrder = "asc" | "desc";

type BabyCareListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  sortOrder?: SortOrder;
  userId?: number;
};

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

export function serializeBabyData<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
}

export async function getBabyProfiles(query: BabyCareListQuery = {}) {
  const where = buildBabyProfileWhere(query);
  return getPaginatedBabyProfiles(where, query);
}

export async function getBabyProfilesByUserId(userId: number, query: BabyCareListQuery = {}) {
  const where = buildBabyProfileWhere({ ...query, userId });
  return getPaginatedBabyProfiles(where, query);
}

export async function getBabyProfileById(id: bigint) {
  const data = await prisma.babyProfile.findUnique({
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

export async function getVaccinationLogsByBabyId(babyId: bigint, query: BabyCareListQuery = {}) {
  return getBabyLogs("vaccinationLog", babyId, { createdAt: "desc" }, query);
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

export async function getMotorSkillLogsByBabyId(babyId: bigint, query: BabyCareListQuery = {}) {
  return getBabyLogs("motorSkillLog", babyId, { createdAt: "desc" }, query);
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

export async function getNutritionLogsByBabyId(babyId: bigint, query: BabyCareListQuery = {}) {
  return getBabyLogs("nutritionLog", babyId, { createdAt: "desc" }, query);
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

export async function getSleepLogsByBabyId(babyId: bigint, query: BabyCareListQuery = {}) {
  return getBabyLogs("sleepLog", babyId, { sleepStart: "desc" }, query);
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

export async function getFeedLogsByBabyId(babyId: bigint, query: BabyCareListQuery = {}) {
  return getBabyLogs("feedLog", babyId, { feedingTime: "desc" }, query);
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

function normalizePagination(query: BabyCareListQuery) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  return { page, limit, skip: (page - 1) * limit };
}

function numericSearch(search?: string) {
  if (!search || !/^[0-9]+$/.test(search)) return undefined;

  try {
    return BigInt(search);
  } catch {
    return undefined;
  }
}

function buildBabyProfileWhere(query: BabyCareListQuery): Prisma.BabyProfileWhereInput {
  const where: Prisma.BabyProfileWhereInput = {};
  const idSearch = numericSearch(query.search);

  if (query.userId) where.userId = query.userId;

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

async function getPaginatedBabyProfiles(
  where: Prisma.BabyProfileWhereInput,
  query: BabyCareListQuery,
) {
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

  const [data, total] = await prisma.$transaction([
    prisma.babyProfile.findMany({
      where,
      include: babyProfileInclude,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.babyProfile.count({ where }),
  ]);

  return serializeBabyData({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
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
  query: BabyCareListQuery = {},
) {
  await ensureBabyProfileExists(babyId);
  const { page, limit, skip } = normalizePagination(query);
  const where = buildBabyLogWhere(modelName, babyId, query.search);
  const resolvedOrderBy = buildBabyLogOrderBy(modelName, query, orderBy);

  const [data, total] = await prisma.$transaction([
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

function buildBabyLogWhere(modelName: BabyLogModel, babyId: bigint, search?: string) {
  const where: Record<string, unknown> = { babyId };
  const idSearch = numericSearch(search);

  if (search) {
    const searchableFields: Record<BabyLogModel, string[]> = {
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

function buildBabyLogOrderBy(
  modelName: BabyLogModel,
  query: BabyCareListQuery,
  defaultOrderBy: Record<string, SortOrder>,
) {
  const allowedSortFields: Record<BabyLogModel, string[]> = {
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
