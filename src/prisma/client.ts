// src/prisma/client.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
prisma.$connect()
    .then(() => console.log('✅ Database connected'))
    .catch(err => {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    });
export default prisma;