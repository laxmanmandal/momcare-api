"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = getUsers;
exports.getRoleWise = getRoleWise;
exports.getUser = getUser;
exports.getBelongsUser = getBelongsUser;
exports.activeInactive = activeInactive;
exports.updateUser = updateUser;
const client_1 = __importDefault(require("../prisma/client"));
const client_2 = require("@prisma/client");
const promises_1 = __importDefault(require("fs/promises"));
const uuidPlugin_1 = require("../plugins/uuidPlugin");
const http_errors_1 = require("http-errors");
async function deleteFileIfExists(path) {
    try {
        await promises_1.default.unlink(path);
    }
    catch { /* ignore */ }
}
async function getUsers(entityId, user, query) {
    const { page = 1, limit = 10, search, role, type, isActive, sortField, sortOrder } = query;
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (pageNumber - 1) * pageSize;
    const isAdmin = user.role === client_2.Role.SUPER_ADMIN || user.role === client_2.Role.ADMIN;
    const sameEntity = user.belongsToId === entityId;
    let whereClause = {};
    if (!(isAdmin && sameEntity)) {
        whereClause.belongsToId = entityId;
    }
    if (search) {
        whereClause.OR = [
            { uuid: { contains: search } },
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { location: { contains: search } }
        ];
    }
    if (role) {
        whereClause.role = role.toUpperCase();
    }
    if (type) {
        whereClause.type = { contains: type };
    }
    if (isActive !== undefined && isActive !== null && isActive !== '') {
        whereClause.isActive =
            typeof isActive === 'boolean'
                ? isActive
                : String(isActive).toLowerCase() === 'true';
    }
    const allowedSortFields = [
        'uuid',
        'role',
        'type',
        'name',
        'email',
        'phone',
        'location',
        'expectedDate',
        'created_at',
        'updated_at'
    ];
    const orderBy = sortField && allowedSortFields.includes(sortField)
        ? { [sortField]: sortOrder ?? client_2.Prisma.SortOrder.asc }
        : { created_at: client_2.Prisma.SortOrder.desc };
    /* 🔢 QUERY */
    const [data, total] = await client_1.default.$transaction([
        client_1.default.user.findMany({
            where: whereClause,
            skip,
            take: pageSize,
            orderBy,
            include: {
                belongsToEntity: {
                    select: { id: true, name: true }
                },
                createdByUser: {
                    select: { id: true, name: true }
                }
            }
        }),
        client_1.default.user.count({
            where: whereClause
        })
    ]);
    return {
        data,
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
        filters: {
            search: search ?? '',
            role: role ?? '',
            type: type ?? '',
            isActive: isActive ?? ''
        }
    };
}
async function getRoleWise(entityId, role, user) {
    const isAdmin = user.role === client_2.Role.SUPER_ADMIN || user.role === client_2.Role.ADMIN;
    const sameEntity = user.belongsToId === entityId;
    // Base where clause
    let whereClause = {};
    if (!(isAdmin && sameEntity)) {
        // non-admin or different entity → restrict
        whereClause.belongsToId = entityId;
    }
    // Add role filter if provided
    if (role) {
        whereClause.role = role.toUpperCase();
    }
    return client_1.default.user.findMany({
        where: whereClause,
        include: {
            belongsToEntity: { select: { id: true, name: true } },
            createdByUser: { select: { id: true, name: true } }
        },
    });
}
async function getUser(uuid) {
    return client_1.default.user.findUnique({
        where: { uuid },
        include: {
            belongsToEntity: { select: { id: true, name: true } },
            createdByUser: true,
        }
    });
}
async function getBelongsUser(belongsToId) {
    const users = await client_1.default.user.findMany({
        where: { belongsToId },
    });
    // Count active users (having at least 1 valid plan allocation)
    const activeUsers = await client_1.default.planAllocation.findMany({
        where: {
            user: { belongsToId },
        },
        distinct: ['userId'], // distinct users only
        select: { userId: true }
    });
    return {
        activeCount: activeUsers.length
    };
}
async function activeInactive(uuid) {
    const user = await client_1.default.user.findUnique({ where: { uuid } });
    if (!user)
        throw new http_errors_1.BadRequest("User not found");
    return client_1.default.user.update({
        where: { uuid },
        data: { isActive: !user.isActive },
    });
}
async function updateUser(userUuid, data) {
    /* ---------------- Fetch user ---------------- */
    const user = await client_1.default.user.findUnique({
        where: { uuid: userUuid },
        select: {
            id: true,
            uuid: true,
            type: true,
            email: true,
            imageUrl: true,
            dob: true,
            dom: true,
            expectedDate: true,
            isActive: true
        }
    });
    if (!user)
        throw new http_errors_1.BadRequest("User not found");
    /* ---------------- Email uniqueness ---------------- */
    if (data.email && data.email !== user.email) {
        const emailExists = await client_1.default.user.findUnique({
            where: { email: data.email }
        });
        if (emailExists) {
            throw new http_errors_1.BadRequest("Email already exists");
        }
    }
    /* ---------------- Date helpers ---------------- */
    const parseYMDToDate = (value) => {
        if (!value)
            return undefined;
        const d = new Date(`${value}T00:00:00Z`);
        return isNaN(d.getTime()) ? undefined : d;
    };
    /* ---------------- Age validation ---------------- */
    if (data.dob && !(0, uuidPlugin_1.isAtLeast18)(data.dob)) {
        throw new http_errors_1.BadRequest("User must be at least 18 years old");
    }
    if (user.dob && data.dom && !(0, uuidPlugin_1.isMarriageAfter18)(user.dob, data.dom)) {
        throw new http_errors_1.BadRequest("Marriage must be after 18 years of age");
    }
    if (data.dom &&
        (0, uuidPlugin_1.isFutureDate)(data.dom)) {
        throw new http_errors_1.BadRequest("Expected date must be in the future");
    }
    /* ---------------- Expected date validation ---------------- */
    if (data.expectedDate &&
        (user.type === "MOTHER" || user.type === "PREG") &&
        !(0, uuidPlugin_1.isFutureDate)(data.expectedDate)) {
        throw new http_errors_1.BadRequest("Expected date must be in the future");
    }
    /* ---------------- Normalize dates before save ---------------- */
    if (data.dob)
        data.dob = data.dob;
    if (data.dom)
        data.dom = data.dom;
    if (data.expectedDate)
        data.expectedDate = data.expectedDate;
    /* ---------------- Delete old image if replaced ---------------- */
    if (user.imageUrl && data.imageUrl && user.imageUrl !== data.imageUrl) {
        await deleteFileIfExists(user.imageUrl);
    }
    /* ---------------- Update ---------------- */
    return client_1.default.user.update({
        where: { uuid: user.uuid },
        data,
        include: {
            createdByUser: {
                select: { id: true, name: true }
            }
        }
    });
}
//# sourceMappingURL=userService.js.map