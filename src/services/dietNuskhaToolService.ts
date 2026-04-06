import prisma from '../prisma/client'
import { deleteFileIfExists } from '../utils/fileUploads'

export async function getDietchart() {
    return prisma.dietChart.findMany({
        include: {
            week: { select: { name: true } }
        }
    });
}
// Diet chart 
export async function getDietChartById(id: number) {
    return await prisma.dietChart.findUnique({
        where: { id },

    },

    )
}
export async function getDietChartByWeekId(weekId: number) {
    return await prisma.dietChart.findMany({
        where: { weekId },

    },

    )
}
export async function createDietchart(data: any) {
    return prisma.dietChart.create({ data })
}

export async function updateDietchart(id: any, data: any) {
    const existing = await prisma.dietChart.findUnique({ where: { id } })
    if (!existing) throw new Error('Diet Chart resourse not found')

    if (data.icon && existing.icon && existing.icon !== data.icon) {
        await deleteFileIfExists(existing.icon)
    }

    return prisma.dietChart.update({ where: { id }, data })
}

export async function DietchartStatus(id: number) {
    const tips = await prisma.dietChart.findUnique({ where: { id } });
    if (!tips) throw new Error("Diet Chart not found");

    return prisma.dietChart.update({
        where: { id },
        data: { isActive: !tips.isActive },
    });
}

// dadi nani k nuskhe 
export async function getDadiNaniNuskhe() {
    return prisma.dadiNaniNuskha.findMany({
        select: {
            id: true,
            creator: true,
            category: true,
            heading: true,
            subheading: true,
            content: true,
            icon: true,
            created_at: true,
            updated_at: true,
        }
    });
}
export async function getNuskheById(id: number) {
    return await prisma.dadiNaniNuskha.findUnique({ where: { id } },
    )
}
export async function createNuskhe(data: any) {
    return prisma.dadiNaniNuskha.create({ data })
}
export async function updateNuskhe(id: any, data: any) {
    const existing = await prisma.dadiNaniNuskha.findUnique({ where: { id } })
    if (!existing) throw new Error('Dadi Nani Nuskhe not found')

    if (data.icon && existing.icon && existing.icon !== data.icon) {
        await deleteFileIfExists(existing.icon)
    }

    return prisma.dadiNaniNuskha.update({ where: { id }, data })
}
export async function NuskheStatus(id: number) {
    const tips = await prisma.dadiNaniNuskha.findUnique({ where: { id } });
    if (!tips) throw new Error("Dadi Nani Nuskhe not found");

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
    if (!existing) throw new Error('week Not Found')

    return prisma.weekTable.update({ where: { id }, data })
}