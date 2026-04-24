"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/prisma/client.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
prisma.$connect()
    .then(() => console.log('✅ Database connected'))
    .catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
});
exports.default = prisma;
//# sourceMappingURL=client.js.map