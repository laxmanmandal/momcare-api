"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = userRoutes;
const auth_1 = require("../middleware/auth");
const client_1 = __importDefault(require("../prisma/client"));
const userService = __importStar(require("../services/userService"));
const jwt_1 = require("../utils/jwt");
const errorResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
    }
};
async function userRoutes(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    // GET /me
    app.get('/me', {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('VIEW_OWN_PROFILE')],
        schema: { tags: ['Users'] }
    }, async (req, reply) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return reply.status(401).send({ error: 'No token provided' });
            }
            const token = authHeader.replace('Bearer ', '');
            const decoded = (0, jwt_1.verifyToken)(token);
            const user = await client_1.default.user.findUnique({
                where: { id: decoded.id },
                include: {
                    belongsToEntity: { select: { name: true } },
                    userPurchase: {
                        select: {
                            id: true,
                            "transactionId": true,
                            "allocatedAt": true,
                            "quantity": true,
                            "plan": { select: { uuid: true } },
                            "sender": { select: { name: true } },
                            "receiver": { select: { name: true } },
                            "user": { select: { name: true } },
                            "allocatedBy": { select: { name: true } },
                        }
                    }
                }
            });
            if (!user)
                return reply.status(404).send({ error: 'User not found' });
            const role = decoded.role?.toUpperCase();
            // Admin users see ALL users
            const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
            const roleCounts = await client_1.default.entityTable.groupBy({
                by: ['type'],
                where: isAdmin ? {} : { belongsToId: decoded.belongsToId },
                _count: { type: true }
            });
            const formattedCounts = roleCounts.reduce((acc, item) => {
                acc[item.type] = item._count.type;
                return acc;
            }, {});
            return reply.send({
                ...user,
                memberCounts: formattedCounts
            });
        }
        catch (err) {
            console.log(err.message);
            app.log.error(err);
            return reply.status(401).send({ error: 'Invalid token' });
        }
    });
    // GET /get user list
    app.get('/list/:entityId', {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('LIST_USER')],
        schema: {
            tags: ['Users'],
            params: {
                type: 'object',
                properties: {
                    entityId: { type: 'string' }
                },
                required: ['entityId']
            },
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'string', default: '1' },
                    limit: { type: 'string', default: '10' },
                    search: { type: 'string' },
                    role: { type: 'string' },
                    type: { type: 'string' },
                    isActive: { type: 'string' },
                    sortField: { type: 'string' },
                    sortOrder: { type: 'string', enum: ['asc', 'desc'] }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: { type: 'array', items: { type: 'object', additionalProperties: true } },
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        totalPages: { type: 'integer' },
                        filters: {
                            type: 'object',
                            properties: {
                                search: { type: 'string' },
                                role: { type: 'string' },
                                type: { type: 'string' },
                                isActive: { type: ['string', 'boolean'] }
                            }
                        }
                    }
                }
            }
        }
    }, async (req) => {
        const { entityId } = req.params;
        const query = req.query;
        const result = await userService.getUsers(Number(entityId), req.user, query);
        return {
            success: true,
            message: 'Users fetched successfully',
            ...result
        };
    });
    // GET /:uuid/profile
    // app.get(
    //   '/:uuid/profile',
    //   {
    //     schema: {
    //       tags: ['Users'],
    //       response: {
    //         200: {
    //           type: 'object',
    //           properties: {
    //             uuid: { type: 'string' },
    //             name: { type: 'string' },
    //             email: { type: 'string' },
    //             role: { type: 'string' },
    //             imageUrl: { type: 'string' },
    //             location: { type: 'string' },
    //             isActive: { type: 'boolean' },
    //             created_at: { type: 'string', format: 'date-time' },
    //             updated_at: { type: 'string', format: 'date-time' },
    //             organization: {
    //               type: 'object',
    //               nullable: true,
    //               properties: { id: { type: 'number' }, name: { type: 'string' } }
    //             },
    //             partner: {
    //               type: 'object',
    //               nullable: true,
    //               properties: { id: { type: 'number' }, name: { type: 'string' } }
    //             },
    //             channel: {
    //               type: 'object',
    //               nullable: true,
    //               properties: { id: { type: 'number' }, name: { type: 'string' } }
    //             },
    //             createdByUser: {
    //               type: 'object',
    //               nullable: true,
    //               properties: { id: { type: 'number' }, name: { type: 'string' } }
    //             },
    //             UserSubscription: {
    //               type: 'array',
    //               items: {
    //                 type: 'object',
    //                 properties: {
    //                   startedAt: { type: 'string', format: 'date-time' },
    //                   expiresAt: { type: 'string', format: 'date-time' },
    //                   subscriptionPlan: {
    //                     type: 'object',
    //                     properties: { id: { type: 'number' }, name: { type: 'string' } }
    //                   }
    //                 }
    //               }
    //             }
    //           }
    //         }
    //       }
    //     }
    //   },
    //   async (req: FastifyRequest, reply: FastifyReply) => {
    //     const { uuid } = req.params as { uuid: string };
    //     try {
    //       const user = await userService.getUser(uuid);
    //       return reply.send(user);
    //     } catch (err: any) {
    //       return reply.status(404).send({ message: err.message || 'User not found' });
    //     }
    //   }
    // );
    // GET /:uuid/:role/child  (returns users created by uuid filtered by role)
    app.get('/list/:entityId/:role', {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('LIST_USER')],
        schema: {
            tags: ['Users'],
            params: {
                type: 'object',
                required: ['entityId', 'role'],
                properties: {
                    entityId: { type: 'string' },
                    role: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'integer' },
                                    uuid: { type: 'string' },
                                    name: { type: 'string' },
                                    child_gender: { type: 'string' },
                                    email: { type: 'string' },
                                    phone: { type: 'string' },
                                    type: { type: 'string' },
                                    expectedDate: { type: 'string', format: 'date-time' },
                                    dob: { type: 'string', format: 'date-time' },
                                    dom: { type: 'string', format: 'date-time' },
                                    role: { type: 'string' },
                                    imageUrl: { type: 'string' },
                                    location: { type: 'string' },
                                    isActive: { type: 'boolean' },
                                    created_at: { type: 'string', format: 'date-time' },
                                    updated_at: { type: 'string', format: 'date-time' },
                                    belongsToEntity: {
                                        type: 'object',
                                        nullable: true,
                                        properties: { id: { type: 'number' }, name: { type: 'string' } }
                                    },
                                    createdByUser: {
                                        type: 'object',
                                        nullable: true,
                                        properties: { id: { type: 'number' }, name: { type: 'string' } }
                                    },
                                    UserSubscription: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                startedAt: { type: 'string', format: 'date-time' },
                                                expiresAt: { type: 'string', format: 'date-time' },
                                                subscriptionPlan: {
                                                    type: 'object',
                                                    properties: { id: { type: 'number' }, name: { type: 'string' } }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, async (req) => {
        const { entityId, role } = req.params;
        return userService.getRoleWise(Number(entityId), role, req.user);
    });
    app.get('/entity/:entityId', {
        schema: {
            tags: ['Users'],
            params: {
                type: 'object',
                required: ['entityId'],
                properties: {
                    entityId: { type: 'string' }
                }
            }
        }
    }, async (req) => {
        const { entityId } = req.params;
        return userService.getBelongsUser(Number(entityId));
    });
    // PATCH /:uuid/status  (toggle active/inactive)
    app.patch('/:uuid/status', {
        preHandler: [auth_1.authMiddleware, app.accessControl.check('UPDATE_USER_STATUS')],
        schema: {
            tags: ['Users'],
            params: {
                type: 'object',
                required: ['uuid'],
                properties: {
                    uuid: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: { type: 'object', additionalProperties: true }
                    }
                },
                400: errorResponse,
                401: errorResponse
            }
        }
    }, async (req, reply) => {
        const { uuid } = req.params;
        const updated = await userService.activeInactive(uuid);
        return reply.send({
            success: true,
            message: 'User status updated successfully',
            data: updated
        });
    });
    // PATCH /:uuid/update  (update user)
    app.patch('/update', {
        preHandler: [
            auth_1.authMiddleware,
            app.accessControl.check('UPDATE_USER'),
        ],
        schema: {
            tags: ['Users'],
            consumes: ['application/json', 'multipart/form-data'],
            body: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    name: { type: 'string', minLength: 2, maxLength: 120 },
                    email: { type: 'string', format: 'email', nullable: true },
                    phone: { type: 'string', minLength: 10, maxLength: 20 },
                    child_gender: { type: 'string' },
                    location: { type: 'string' },
                    type: { type: 'string' },
                    expectedDate: { type: 'string', format: 'date' },
                    dob: { type: 'string', format: 'date' },
                    dom: { type: 'string', format: 'date' },
                    imageUrl: { type: 'string', contentEncoding: 'binary' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: { type: 'object', additionalProperties: true }
                    }
                },
                400: errorResponse,
                401: errorResponse
            }
        }
    }, async (req, reply) => {
        // Get logged-in user's UUID from authMiddleware
        const uuid = req.user?.uuid;
        if (!uuid) {
            return reply.code(401).send({
                success: false,
                message: 'Unauthorized: missing uuid in auth payload',
            });
        }
        let fields = {};
        let files = {};
        // CASE 1: Multipart/form-data request
        if (req.isMultipart()) {
            const mp = await app.parseMultipartMemory(req);
            fields = mp.fields || {};
            files = mp.files || {};
        }
        // CASE 2: JSON request
        else {
            fields = req.body || {};
        }
        // Build only allowed update fields
        const updateData = {};
        const allowed = [
            "name",
            "email",
            "phone",
            "child_gender",
            "location",
            "type",
            "expectedDate",
            "dob",
            "dom",
        ];
        for (const key of allowed) {
            if (!(key in fields))
                continue;
            const value = fields[key];
            /* ───────── EMAIL (optional, unique, nullable) ───────── */
            if (key === 'email') {
                // if email key exists but value is empty → set NULL
                if (value === null || value === '' || value === undefined) {
                    updateData.email = null;
                    continue;
                }
                // uniqueness check (exclude same user)
                const emailExists = await client_1.default.user.findFirst({
                    where: {
                        email: value,
                        NOT: { id: req.user.id }
                    }
                });
                if (emailExists) {
                    return reply.code(400).send({ success: false, message: `Email already exists` });
                }
                updateData.email = value;
                continue;
            }
            /* ───────── DATE FIELDS ───────── */
            if (key === 'expectedDate' || key === 'dob' || key === 'dom') {
                if (!value) {
                    updateData[key] = null;
                }
                else if (!isNaN(Date.parse(value))) {
                    updateData[key] = new Date(value);
                }
                else {
                    updateData[key] = new Date(value + 'T00:00:00Z');
                }
                continue;
            }
            /* ───────── OTHER FIELDS ───────── */
            updateData[key] = value;
        }
        // Handle optional image upload
        if (files.imageUrl && files.imageUrl.length > 0) {
            const savedPath = await app.saveFileBuffer(files.imageUrl[0], "user-profile");
            updateData.imageUrl = savedPath;
        }
        // Update user
        const updatedUser = await userService.updateUser(uuid, updateData);
        return reply.code(200).send({
            success: true,
            message: 'User updated successfully',
            data: updatedUser,
        });
    });
}
//# sourceMappingURL=users.js.map