import prisma from '../prisma/client'
import { deleteFileIfExists } from '../utils/fileUploads'

function parseStoredList(value: any): any[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(String(value));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return String(value)
            .split(/\r?\n|,/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
}

function normalizeList(value: any, splitCommas = false): string | undefined {
    if (value === undefined) return undefined;
    if (value === null) return JSON.stringify([]);
    if (Array.isArray(value)) return JSON.stringify(value);

    const raw = String(value).trim();
    if (!raw) return JSON.stringify([]);

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch { }

    const splitter = splitCommas ? /\r?\n|,/ : /\r?\n/;
    return JSON.stringify(
        raw
            .split(splitter)
            .map((item) => item.trim())
            .filter(Boolean)
    );
}

function normalizeExpertPayload(data: any) {
    const payload = { ...data };
    if (payload.certifications !== undefined) {
        payload.certifications = normalizeList(payload.certifications);
    }
    if (payload.availability !== undefined) {
        payload.availability = normalizeList(payload.availability);
    }
    if (payload.languages !== undefined) {
        payload.languages = normalizeList(payload.languages, true);
    }
    return payload;
}

function serializeExpert(expert: any) {
    if (!expert) return expert;
    return {
        ...expert,
        certifications: parseStoredList(expert.certifications),
        availability: parseStoredList(expert.availability),
        languages: parseStoredList(expert.languages),
    };
}

export async function getexperts() {
    const experts = await prisma.expert.findMany({

        include: {
            Professions: true,
        }, orderBy: {
            id: 'desc',
        },
    });

    return experts.map(serializeExpert);
}
export async function getexpertsById(id: number) {
    const expert = await prisma.expert.findUnique({
        where: { id }, include: {
            Professions: true,
        }
    },
    );

    return serializeExpert(expert);
}
export async function createExperts(data: any) {
    const expert = await prisma.expert.create({ data: normalizeExpertPayload(data) })
    return serializeExpert(expert);
}

export async function updateexperts(id: any, data: any) {
    const existing = await prisma.expert.findUnique({ where: { id } })
    if (!existing) throw new Error('Expert not found')

    if (data.image && existing.image && existing.image !== data.image) {
        await deleteFileIfExists(existing.image)
    }

    const expert = await prisma.expert.update({ where: { id }, data: normalizeExpertPayload(data) })
    return serializeExpert(expert);
}
