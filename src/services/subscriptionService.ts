import { PrismaClient } from '@prisma/client';
import { deleteFileIfExists } from '../utils/fileUploads';
const prisma = new PrismaClient();

// -----------------------------
// Types
// -----------------------------
export type CreatePlanInput = {
  uuid: string;          // required from UI
  name: string;
  price: number;
  courseIds?: number[];
}

export type UpdatePlanInput = Partial<{

  name: string;
  thumbnail: string;
  price: number;
  isActive: boolean;
  courseIds: number[]
}>

// -----------------------------
// Subscription Plans
// -----------------------------

export async function getPlans() {
  const plans = await prisma.subscriptionPlan.findMany({
    include: {
      courses: {
        select: { courseId: true },
      },
    },
  });

  // Transform each plan's courses into an array of IDs
  return plans.map(plan => ({
    ...plan,
    courses: plan.courses.map(c => c.courseId),
  }));
}
export async function getPlansByManyIds(ids: number[]) {
  const plans = await prisma.subscriptionPlan.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    include: {
      courses: {
        select: {
          courseId: true,
        },
      },
    },
  });

  // transform courses -> number[]
  return plans.map(plan => ({
    ...plan,
    courses: plan.courses.map(c => c.courseId),
  }));
}


// Get a single plan by UUID
export async function getPlan(uuid: string) {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { uuid },
    include: {
      courses: {
        select: { courseId: true },
      },
    },
  });

  if (!plan) throw new Error('Plan not found');

  // Convert array of objects to array of numbers or strings
  return {
    ...plan,
    courses: plan.courses.map(c => c.courseId),
  };
}



export async function createPlan(data: CreatePlanInput) {
  console.info('[createPlan] start', { data });

  // defensive: ensure proper types (caller should already do this)
  if (typeof data.price === 'string') {
    data.price = parseInt(data.price as any, 10);
  }
  if (isNaN(Number(data.price))) {
    throw new Error('Invalid price');
  }

  // extract courseIds so we DON'T pass it into subscriptionPlan.create()
  const { courseIds, ...planFields } = data as any;

  return await prisma.$transaction(async (tx) => {
    // 1) create plan without courseIds
    const plan = await tx.subscriptionPlan.create({
      data: planFields
    });
    console.info('[createPlan] created plan', { planId: plan.id, uuid: plan.uuid });

    // 2) create subscriptionCourse rows if courseIds is an array
    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
      const subscriptionCourses = courseIds.map((courseId: any) => ({
        subscriptionPlanId: Number(plan.id),
        courseId
      }));

      // createMany is fine here
      await tx.subscriptionCourse.createMany({ data: subscriptionCourses });
      console.info('[createPlan] created subscriptionCourses', { count: subscriptionCourses.length });
    }

    // 3) return plan with included courses relation
    const result = await tx.subscriptionPlan.findUnique({
      where: { uuid: plan.uuid },
      include: { courses: true }
    });

    console.info('[createPlan] returning result', { id: result?.id, courses: result?.courses?.length });
    return result;
  });
}


export async function updatePlan(uuid: string, data: UpdatePlanInput) {
  console.info('[updatePlan] start', { uuid, keys: Object.keys(data || {}) });

  // normalize price if needed
  if (data.price && typeof data.price === 'string') {
    (data as any).price = parseInt(data.price as any, 10);
  }

  const { courseIds, ...planFields } = data as any;

  return await prisma.$transaction(async (tx) => {
    const plan = await tx.subscriptionPlan.findUnique({ where: { uuid } });
    if (!plan) throw new Error('Plan not found');

    // cleanup old thumbnail if required
    if (planFields.thumbnail && plan.thumbnail && plan.thumbnail !== planFields.thumbnail) {
      try {
        await deleteFileIfExists(plan.thumbnail);
        console.info('[updatePlan] deleted old thumbnail', { old: plan.thumbnail });
      } catch (err) {
        console.warn('[updatePlan] failed to delete old thumbnail — continuing', err);
      }
    }

    // 2) update plan (without courseIds)
    await tx.subscriptionPlan.update({
      where: { uuid },
      data: planFields
    });
    console.info('[updatePlan] updated plan fields');

    // 3) handle courseIds (replace existing)
    if (typeof courseIds !== 'undefined') {
      // remove old
      await tx.subscriptionCourse.deleteMany({
        where: { subscriptionPlanId: plan.id }
      });

      // add new if provided as array
      if (Array.isArray(courseIds) && courseIds.length > 0) {
        const subscriptionCourses = courseIds.map((courseId: any) => ({
          subscriptionPlanId: plan.id,
          courseId
        }));
        await tx.subscriptionCourse.createMany({ data: subscriptionCourses });
        console.info('[updatePlan] created new subscriptionCourses', { count: subscriptionCourses.length });
      } else {
        console.info('[updatePlan] courseIds provided but empty or not array — no courses created');
      }
    }

    const result = await tx.subscriptionPlan.findUnique({
      where: { uuid },
      include: { courses: true }
    });

    console.info('[updatePlan] returning result', { id: result?.id });
    return result;
  });
}
export async function SubscriptionStatus(uuid: string) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { uuid } });
  if (!plan) throw new Error("Subscription plan not found");

  return prisma.subscriptionPlan.update({
    where: { uuid },
    data: { isActive: !plan.isActive },
  });
}
export async function SubscriptionVisible(uuid: string) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { uuid } });
  if (!plan) throw new Error("Subscription plan not found");

  return prisma.subscriptionPlan.update({
    where: { uuid },
    data: { isVisible: !plan.isVisible },
  });
}
