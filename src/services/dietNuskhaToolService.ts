import prisma from '../prisma/client'
import { deleteFileIfExists } from '../utils/fileUploads'
import { BadRequest } from 'http-errors';

type ContentToolListQuery = {
    search?: string;
    category?: string;
    isActive?: boolean;
    weekId?: number;
    page?: number;
    limit?: number;
    sortField?: 'id' | 'heading' | 'category' | 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
}

function buildContentToolWhere(query: ContentToolListQuery, options: { includeWeek?: boolean } = {}) {
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
    if (options.includeWeek && query.weekId !== undefined) where.weekId = query.weekId;

    return where;
}

function paginationFrom(query: ContentToolListQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    return { page, limit, skip: (page - 1) * limit };
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

function normalizeContentPayload(data: any) {
    if (data?.content === undefined) return data;
    return {
        ...data,
        content: normalizeJsonContent(data.content),
    };
}

export async function getDietchart(query: ContentToolListQuery = {}) {
    const { page, limit, skip } = paginationFrom(query);
    const where = buildContentToolWhere(query, { includeWeek: true });
    const sortField = query.sortField ?? 'created_at';
    const sortOrder = query.sortOrder ?? 'desc';

    const [data, total] = await prisma.$transaction([
        prisma.dietChart.findMany({
            where,
            include: {
                week: { select: { name: true } }
            },
            orderBy: {
                [sortField]: sortOrder,
            },
            skip,
            take: limit,
        }),
        prisma.dietChart.count({ where }),
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
// Diet chart 
export async function getDietChartById(id: number) {
    return await prisma.dietChart.findUnique({
        where: { id },

    },

    )
}
export async function getDietChartByWeekId(weekId: number, query: ContentToolListQuery = {}) {
    const { page, limit, skip } = paginationFrom(query);
    const where = buildContentToolWhere({ ...query, weekId }, { includeWeek: true });
    const sortField = query.sortField ?? 'created_at';
    const sortOrder = query.sortOrder ?? 'desc';

    const [data, total] = await prisma.$transaction([
        prisma.dietChart.findMany({
            where,
            include: {
                week: { select: { name: true } }
            },
            orderBy: {
                [sortField]: sortOrder,
            },
            skip,
            take: limit,
        }),
        prisma.dietChart.count({ where }),
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
export async function createDietchart(data: any) {
    return prisma.dietChart.create({ data: normalizeContentPayload(data) })
}

export async function updateDietchart(id: any, data: any) {
    const existing = await prisma.dietChart.findUnique({ where: { id } })
    if (!existing) throw new BadRequest('Diet Chart resource not found')

    if (data.icon && existing.icon && existing.icon !== data.icon) {
        await deleteFileIfExists(existing.icon)
    }

    return prisma.dietChart.update({ where: { id }, data: normalizeContentPayload(data) })
}

export async function DietchartStatus(id: number) {
    const tips = await prisma.dietChart.findUnique({ where: { id } });
    if (!tips) throw new BadRequest("Diet Chart not found");

    return prisma.dietChart.update({
        where: { id },
        data: { isActive: !tips.isActive },
    });
}

// dadi nani k nuskhe 
export async function getDadiNaniNuskhe(query: ContentToolListQuery = {}) {
    const { page, limit, skip } = paginationFrom(query);
    const where = buildContentToolWhere(query);
    const sortField = query.sortField ?? 'created_at';
    const sortOrder = query.sortOrder ?? 'desc';

    const [data, total] = await prisma.$transaction([
        prisma.dadiNaniNuskha.findMany({
            where,
            select: {
                id: true,
                creator: true,
                category: true,
                heading: true,
                subheading: true,
                content: true,
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
        prisma.dadiNaniNuskha.count({ where }),
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
export async function getNuskheById(id: number) {
    return await prisma.dadiNaniNuskha.findUnique({ where: { id } },
    )
}
export async function createNuskhe(data: any) {
    return prisma.dadiNaniNuskha.create({ data: normalizeContentPayload(data) })
}
export async function updateNuskhe(id: any, data: any) {
    const existing = await prisma.dadiNaniNuskha.findUnique({ where: { id } })
    if (!existing) throw new BadRequest('Dadi Nani Nuskhe not found')

    if (data.icon && existing.icon && existing.icon !== data.icon) {
        await deleteFileIfExists(existing.icon)
    }

    return prisma.dadiNaniNuskha.update({ where: { id }, data: normalizeContentPayload(data) })
}
export async function NuskheStatus(id: number) {
    const tips = await prisma.dadiNaniNuskha.findUnique({ where: { id } });
    if (!tips) throw new BadRequest("Dadi Nani Nuskhe not found");

    return prisma.dadiNaniNuskha.update({
        where: { id },
        data: { isActive: !tips.isActive },
    });
}

export async function getWeeks(order: 'asc' | 'desc' = 'asc') {
    return prisma.weekTable.findMany({
        orderBy: {
            order: order   // assuming your column name is "order"
        }
    });
}

// Diet chart 

export async function createWeek(data: any) {
    return prisma.weekTable.create({ data })
}
export async function getWeekById(id: number) {
    return await prisma.weekTable.findUnique({ where: { id } },
    )
}
export async function updateWeek(id: any, data: any) {
    const existing = await prisma.weekTable.findUnique({ where: { id } })
    if (!existing) throw new BadRequest('Week not found')

    return prisma.weekTable.update({ where: { id }, data })
}
