import prisma from '../prisma/client';
import { storageService } from './storageService';



interface MediaSearchParams {
    query?: string;
    type?: string;
    mimeType?: string;
}
export async function getMedia() {
    return prisma.mediaResource.findMany({
        orderBy: { created_at: 'desc' },
    });
}

export async function getMediaByuuid(uuid: string) {
    return await prisma.mediaResource.findUnique({ where: { uuid } })
}

export async function getMediaById(id: number) {
    return await prisma.mediaResource.findUnique({
        where: {
            id: Number(id) // ✅ Convert to number
        }
    });
}

export async function createMedia(data: any) {
    return prisma.mediaResource.create({ data });
}

export async function updateMedia(uuid: string, data: any) {
    const existing = await prisma.mediaResource.findUnique({ where: { uuid } });
    if (!existing) throw new Error('Media resource not found');

    const { thumbnail, url } = data;

    const tasks: Promise<void>[] = [];

    if (thumbnail && existing.thumbnail && existing.thumbnail !== thumbnail) {
        tasks.push(storageService.deleteFile(existing.thumbnail));
    }

    if (url && existing.url && existing.url !== url) {
        tasks.push(storageService.deleteFile(existing.url));
    }

    if (tasks.length) await Promise.all(tasks);

    return prisma.mediaResource.update({ where: { uuid }, data });
}

export async function search(params: MediaSearchParams) {
    const { query, type, mimeType } = params;

    return prisma.mediaResource.findMany({
        where: {
            isActive: true,
            AND: [
                query ? { title: { contains: query } } : {},
                type ? { type } : {},
                mimeType ? { mimeType } : {},
            ],
        },
        take: 50, // limit results
        orderBy: { created_at: 'desc' },
    });
}