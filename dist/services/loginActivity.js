"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordLastLogin = recordLastLogin;
exports.getAllLoginHistory = getAllLoginHistory;
exports.getUserLogin = getUserLogin;
const client_1 = __importDefault(require("../prisma/client"));
/* ─────────────────────────────
   Helpers
───────────────────────────── */
function buildPagination(query) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
function buildSearchWhere(search) {
    if (!search)
        return undefined;
    return {
        OR: [
            {
                uuid: { contains: search }
            },
            {
                ip: { contains: search }
            },
            {
                User: {
                    name: { contains: search }
                }
            }
        ]
    };
}
/* ─────────────────────────────
   Record last login (SUCCESS only)
───────────────────────────── */
async function recordLastLogin(input) {
    return client_1.default.login_activity.create({
        data: {
            user_id: input.userId,
            uuid: input.uuid,
            ip: input.ip,
            last_login: new Date()
        }
    });
}
/* ─────────────────────────────
   Get ALL login history (ADMIN)
───────────────────────────── */
async function getAllLoginHistory(query) {
    const { page, limit, skip } = buildPagination(query);
    const where = buildSearchWhere(query.search);
    const [data, total] = await client_1.default.$transaction([
        client_1.default.login_activity.findMany({
            where,
            orderBy: { last_login: "desc" },
            skip,
            take: limit,
            include: {
                User: {
                    select: {
                        name: true,
                        role: true
                    }
                }
            }
        }),
        client_1.default.login_activity.count({ where })
    ]);
    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}
/* ─────────────────────────────
   Get login history of a USER
───────────────────────────── */
async function getUserLogin(userId, query) {
    const { page, limit, skip } = buildPagination(query);
    const where = {
        user_id: userId,
        ...(buildSearchWhere(query.search) ?? {})
    };
    const [data, total] = await client_1.default.$transaction([
        client_1.default.login_activity.findMany({
            where,
            orderBy: { last_login: "desc" },
            skip,
            take: limit,
            include: {
                User: {
                    select: {
                        name: true,
                        role: true
                    }
                }
            }
        }),
        client_1.default.login_activity.count({ where })
    ]);
    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}
//# sourceMappingURL=loginActivity.js.map