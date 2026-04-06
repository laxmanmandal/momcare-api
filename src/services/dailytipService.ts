import prisma from '../prisma/client'
import { deleteFileIfExists } from '../utils/fileUploads'

export async function getdailyTips() {
    return prisma.dailyTip.findMany({
        select: {
            id: true,
            creator: true,
            heading: true,
            subheading: true,
            content: true,
            category: true,
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
    return prisma.dailyTip.create({ data })
}

export async function updatedailyTips(id: any, data: any) {
    const existing = await prisma.dailyTip.findUnique({ where: { id } })
    if (!existing) throw new Error('Daily Tips resourse not found')

    if (data.icon && existing.icon && existing.icon !== data.icon) {
        await deleteFileIfExists(existing.icon)
    }

    return prisma.dailyTip.update({ where: { id }, data })
} export async function dailyTipsStatus(id: number) {
    const tips = await prisma.dailyTip.findUnique({ where: { id } });
    if (!tips) throw new Error("Daily Tips not found");

    return prisma.dailyTip.update({
        where: { id },
        data: { isActive: !tips.isActive },
    });
}