import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import crypto from "crypto";
declare module 'fastify' {
    interface FastifyInstance {
        uid: (prefix: string, model: keyof PrismaClient) => Promise<string>;
    }
}

async function uidPlugin(fastify: FastifyInstance) {
    const prisma = new PrismaClient();

    fastify.decorate(
        'uid',
        async (prefix: string, model: keyof PrismaClient): Promise<string> => {
            // @ts-ignore — because Prisma models are dynamic
            const lastRecord = await prisma[model].findFirst({
                orderBy: { id: 'desc' },
            });

            const nextId = lastRecord ? lastRecord.id + 1 : 1;
            console.log('last record: -', `${prefix}_${nextId}`);

            return `${prefix}_${nextId}`; // ✅ results in something like CRS_101

        }
    );
}
export function generateOrderId(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `ORD_${date}_${random}`;
}

export function generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `TXN_${timestamp}_${random}`;
}
export function isAtLeast18(date: Date): boolean {
    const today = new Date();

    let age = today.getUTCFullYear() - date.getUTCFullYear();

    const hasHadBirthdayThisYear =
        today.getUTCMonth() > date.getUTCMonth() ||
        (today.getUTCMonth() === date.getUTCMonth() &&
            today.getUTCDate() >= date.getUTCDate());

    if (!hasHadBirthdayThisYear) {
        age--;
    }

    return age >= 18;
}
export function isFutureDate(date: Date): boolean {
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    return date.getTime() > todayUTC.getTime();
}
export function isMarriageAfter18(dob: Date, dom: Date): boolean {
    // Minimum allowed marriage date = DOB + 18 years
    const minMarriageDate = new Date(
        Date.UTC(
            dob.getUTCFullYear() + 18,
            dob.getUTCMonth(),
            dob.getUTCDate()
        )
    );

    return dom.getTime() >= minMarriageDate.getTime();
}

export default fp(uidPlugin, { name: 'uidPlugin' });
