
import prisma from '../prisma/client';
import { Prisma, Role } from '@prisma/client';
import fs from 'fs/promises';
import { isAtLeast18, isFutureDate, isMarriageAfter18 } from '../plugins/uuidPlugin';
import { BadRequest } from "http-errors";
async function deleteFileIfExists(path: string) {
  try { await fs.unlink(path); } catch { /* ignore */ }
}




export async function getUsers(
  entityId: number,
  user: any,
  query: {
    page?: number;
    limit?: number;
    search?: string;
    sortField?: string;
    sortOrder?: Prisma.SortOrder;
  }
) {
  const {
    page = 1,
    limit = 10,
    search,
    sortField,
    sortOrder
  } = query;

  const skip = (page - 1) * limit;

  const isAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;

  const sameEntity = user.belongsToId === entityId;

  let whereClause: Prisma.UserWhereInput = {};

  if (!(isAdmin && sameEntity)) {
    whereClause.belongsToId = entityId;
  }
  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } }
    ];
  }
  const allowedSortFields = [
    'name',
    'email',
    'phone',
    'created_at'
  ] as const;

  const orderBy: Prisma.UserOrderByWithRelationInput =
    sortField && allowedSortFields.includes(sortField as any)
      ? { [sortField]: sortOrder ?? Prisma.SortOrder.asc }
      : { created_at: Prisma.SortOrder.desc };

  /* 🔢 QUERY */
  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy,
      include: {
        belongsToEntity: {
          select: { id: true, name: true }
        },
        createdByUser: {
          select: { id: true, name: true }
        }
      }
    }),

    prisma.user.count({
      where: whereClause
    })
  ]);

  return {
    data,
    total,
    page,
    limit
  };
}


export async function getRoleWise(entityId?: number, role?: string, user?: any) {
  const isAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
  const sameEntity = user.belongsToId === entityId;

  // Base where clause
  let whereClause: any = {};

  if (!(isAdmin && sameEntity)) {
    // non-admin or different entity → restrict
    whereClause.belongsToId = entityId;
  }

  // Add role filter if provided
  if (role) {
    whereClause.role = role.toUpperCase();
  }
  return prisma.user.findMany({
    where: whereClause,
    include: {
      belongsToEntity: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, name: true } }
    },
  });
}


export async function getUser(uuid: string) {
  return prisma.user.findUnique({
    where: { uuid },
    include: {
      belongsToEntity: { select: { id: true, name: true } },
      createdByUser: true,

    }
  });
}

export async function getBelongsUser(belongsToId: number) {
  const users = await prisma.user.findMany({
    where: { belongsToId },

  });

  // Count active users (having at least 1 valid plan allocation)
  const activeUsers = await prisma.planAllocation.findMany({
    where: {
      user: { belongsToId },

    },
    distinct: ['userId'],        // distinct users only
    select: { userId: true }
  });

  return {
    activeCount: activeUsers.length
  };
}


export async function activeInactive(uuid: string) {
  const user = await prisma.user.findUnique({ where: { uuid } });
  if (!user) throw new BadRequest("User not found");

  return prisma.user.update({
    where: { uuid },
    data: { isActive: !user.isActive },
  });
}

export async function updateUser(userUuid: string, data: any) {
  /* ---------------- Fetch user ---------------- */
  const user = await prisma.user.findUnique({
    where: { uuid: userUuid },
    select: {
      id: true,
      uuid: true,
      type: true,
      email: true,
      imageUrl: true,
      dob: true,
      dom: true,
      expectedDate: true,
      isActive: true
    }
  });

  if (!user) throw new BadRequest("User not found");

  /* ---------------- Email uniqueness ---------------- */
  if (data.email && data.email !== user.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email: data.email }
    });
    if (emailExists) {
      throw new BadRequest("Email already exists");
    }
  }

  /* ---------------- Date helpers ---------------- */
  const parseYMDToDate = (value?: string): Date | undefined => {
    if (!value) return undefined;
    const d = new Date(`${value}T00:00:00Z`);
    return isNaN(d.getTime()) ? undefined : d;
  };



  /* ---------------- Age validation ---------------- */
  if (data.dob && !isAtLeast18(data.dob)) {

    throw new BadRequest("User must be at least 18 years old");
  }
  if (user.dob && data.dom && !isMarriageAfter18(user.dob, data.dom)) {
    throw new BadRequest("Marriage must be after 18 years of age");
  }
  if (
    data.dom &&
    isFutureDate(data.dom)
  ) {
    throw new BadRequest("Expected date must be in the future");
  }
  /* ---------------- Expected date validation ---------------- */
  if (
    data.expectedDate &&
    (user.type === "MOTHER" || user.type === "PREG") &&
    !isFutureDate(data.expectedDate)
  ) {
    throw new BadRequest("Expected date must be in the future");
  }

  /* ---------------- Normalize dates before save ---------------- */
  if (data.dob) data.dob = data.dob;
  if (data.dom) data.dom = data.dom;
  if (data.expectedDate) data.expectedDate = data.expectedDate;

  /* ---------------- Delete old image if replaced ---------------- */
  if (user.imageUrl && data.imageUrl && user.imageUrl !== data.imageUrl) {
    await deleteFileIfExists(user.imageUrl);
  }

  /* ---------------- Update ---------------- */
  return prisma.user.update({
    where: { uuid: user.uuid },
    data,
    include: {
      createdByUser: {
        select: { id: true, name: true }
      }
    }
  });
}

