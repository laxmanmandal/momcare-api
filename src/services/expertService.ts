import prisma from '../prisma/client'
import { deleteFileIfExists } from '../utils/fileUploads'

export async function getexperts() {
    return prisma.expert.findMany({

        include: {
            Professions: true,
        }, orderBy: {
            id: 'desc',
        },
    });
}
export async function getexpertsById(id: number) {
    return await prisma.expert.findUnique({
        where: { id }, include: {
            Professions: true,
        }
    },
    )
}
export async function createExperts(data: any) {
    return prisma.expert.create({ data })
}

export async function updateexperts(id: any, data: any) {
    const existing = await prisma.expert.findUnique({ where: { id } })
    if (!existing) throw new Error('Expert not found')

    if (data.image && existing.image && existing.image !== data.image) {
        await deleteFileIfExists(existing.image)
    }

    return prisma.expert.update({ where: { id }, data })
}