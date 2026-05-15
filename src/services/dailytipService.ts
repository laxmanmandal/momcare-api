import prisma from '../prisma/client'
import { deleteFileIfExists } from '../utils/fileUploads'
import { BadRequest } from 'http-errors';

type DailyTipListQuery = {
    search?: string;
    category?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortField?: 'id' | 'heading' | 'category' | 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
}

function buildDailyTipWhere(query: DailyTipListQuery) {
    const where: any = {};

    if (query.search) {
        where.OR = [
            { heading: { contains: query.search } },
            { subheading: { contains: query.search } },
            { content: { contains: query.search } },
            { creator: { contains: query.search } },
        ];
    }

    if (query.category) where.category = query.category;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return where;
}

function normalizeJsonContent(value: unknown) {
    if (value === undefined) return undefined;
    if (typeof value !== 'string') return JSON.stringify(value);

    const trimmed = value.trim();
    if (!trimmed) return JSON.stringify('');

    try {
        return JSON.stringify(JSON.parse(trimmed));
    } catch {
        return JSON.stringify(value);
    }
}

function normalizeDailyTipPayload(data: any) {
    if (data?.content === undefined) return data;
    return {
        ...data,
        content: normalizeJsonContent(data.content),
    };
}

export async function getdailyTips(query: DailyTipListQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;
    const where = buildDailyTipWhere(query);
    const sortField = query.sortField ?? 'created_at';
    const sortOrder = query.sortOrder ?? 'desc';

    const [data, total] = await prisma.$transaction([
        prisma.dailyTip.findMany({
            where,
            select: {
                id: true,
                creator: true,
                heading: true,
                subheading: true,
                content: true,
                category: true,
                isActive: true,
                icon: true,
                created_at: true,
                updated_at: true,
            },
            orderBy: {
                [sortField]: sortOrder,
            },
            skip,
            take: limit,
        }),
        prisma.dailyTip.count({ where }),
    ]);

    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function getAllDailyTips() {
    return prisma.dailyTip.findMany({
        select: {
            id: true,
            creator: true,
            heading: true,
            subheading: true,
            content: true,
            category: true,
            isActive: true,
            icon: true,
            created_at: true,
            updated_at: true,
        },
        orderBy: {
            id: 'asc',
        },
    });
}
export async function getdailyTipsById(id: number) {
    return await prisma.dailyTip.findUnique({ where: { id } },
    )
}
export async function createdailyTips(data: any) {
    return prisma.dailyTip.create({ data: normalizeDailyTipPayload(data) })
}

export async function updatedailyTips(id: any, data: any) {
    const existing = await prisma.dailyTip.findUnique({ where: { id } })
    if (!existing) throw new BadRequest('Daily Tips resource not found')

    if (data.icon && existing.icon && existing.icon !== data.icon) {
        await deleteFileIfExists(existing.icon)
    }

    return prisma.dailyTip.update({ where: { id }, data: normalizeDailyTipPayload(data) })
} export async function dailyTipsStatus(id: number) {
    const tips = await prisma.dailyTip.findUnique({ where: { id } });
    if (!tips) throw new BadRequest("Daily Tips not found");

    return prisma.dailyTip.update({
        where: { id },
        data: { isActive: !tips.isActive },
    });
}
