import prisma from "../prisma/client";
import { Prisma } from "@prisma/client";

/* ─────────────────────────────
   Types
───────────────────────────── */

export interface LoginHistoryQuery {
    search?: string;
    page?: number;
    limit?: number;
}

/* ─────────────────────────────
   Helpers
───────────────────────────── */

function buildPagination(query: LoginHistoryQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
}

function buildSearchWhere(
    search?: string
): Prisma.login_activityWhereInput | undefined {
    if (!search) return undefined;

    return {
        OR: [
            {
                uuid: { contains: search }
            },
            {
                ip: { contains: search }
            },
            {
                User: {
                    name: { contains: search }
                }
            }
        ]
    };
}

/* ─────────────────────────────
   Record last login (SUCCESS only)
───────────────────────────── */

export async function recordLastLogin(input: {
    userId: number;
    uuid: string;
    ip: string;
}) {
    return prisma.login_activity.create({
        data: {
            user_id: input.userId,
            uuid: input.uuid,
            ip: input.ip,
            last_login: new Date()
        }
    });
}

/* ─────────────────────────────
   Get ALL login history (ADMIN)
───────────────────────────── */

export async function getAllLoginHistory(query: LoginHistoryQuery) {
    const { page, limit, skip } = buildPagination(query);
    const where = buildSearchWhere(query.search);

    const [data, total] = await prisma.$transaction([
        prisma.login_activity.findMany({
            where,
            orderBy: { last_login: "desc" },
            skip,
            take: limit,
            include: {
                User: {
                    select: {
                        name: true,
                        role: true
                    }
                }
            }
        }),
        prisma.login_activity.count({ where })
    ]);

    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/* ─────────────────────────────
   Get login history of a USER
───────────────────────────── */

export async function getUserLogin(
    userId: number,
    query: LoginHistoryQuery
) {
    const { page, limit, skip } = buildPagination(query);

    const where: Prisma.login_activityWhereInput = {
        user_id: userId,
        ...(buildSearchWhere(query.search) ?? {})
    };

    const [data, total] = await prisma.$transaction([
        prisma.login_activity.findMany({
            where,
            orderBy: { last_login: "desc" },
            skip,
            take: limit,
            include: {
                User: {
                    select: {
                        name: true,
                        role: true
                    }
                }
            }
        }),
        prisma.login_activity.count({ where })
    ]);

    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}
