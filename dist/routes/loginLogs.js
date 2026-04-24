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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoginLogsRoutes;
const loginActivity = __importStar(require("../services/loginActivity"));
const auth_1 = require("../middleware/auth");
async function LoginLogsRoutes(app) {
    const loginHistoryResponseSchema = {
        200: {
            type: "object",
            properties: {
                success: { type: "boolean" },
                data: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "number" },
                            user_id: { type: "number" },
                            uuid: { type: "string" },
                            ip: { type: "string" },
                            last_login: { type: "string", format: "date-time" },
                            User: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    role: { type: "string" }
                                }
                            }
                        }
                    }
                },
                pagination: {
                    type: "object",
                    properties: {
                        total: { type: "number" },
                        page: { type: "number" },
                        limit: { type: "number" },
                        totalPages: { type: "number" }
                    }
                }
            }
        }
    };
    const paginationQuerySchema = {
        type: "object",
        properties: {
            search: { type: "string" },
            page: {
                type: "number", // Will auto-convert from string
                minimum: 1,
                default: 1
            },
            limit: {
                type: "number", // Will auto-convert from string
                minimum: 1,
                maximum: 100,
                default: 10
            }
        }
    };
    app.get('/', {
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg],
        schema: {
            tags: ['auth'],
            querystring: paginationQuerySchema,
            response: loginHistoryResponseSchema
        }
    }, async (req, reply) => {
        // Now these are already numbers!
        const { search, page, limit } = req.query;
        console.log('Query params:', {
            search,
            page, // Already a number
            limit // Already a number
        });
        const result = await loginActivity.getAllLoginHistory({
            search,
            page,
            limit
        });
        return reply.code(200).send({
            success: true,
            ...result
        });
    });
    app.get('/:userId', {
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg],
        schema: {
            tags: ['auth'],
            params: {
                type: "object",
                required: ["userId"],
                properties: {
                    userId: { type: "number" }
                }
            },
            querystring: paginationQuerySchema,
            response: loginHistoryResponseSchema
        }
    }, async (req, reply) => {
        const { userId } = req.params;
        const { search, page = 1, limit = 10 } = req.query;
        const result = await loginActivity.getUserLogin(userId, {
            search,
            page: Number(page),
            limit: Number(limit)
        });
        return reply.code(200).send({
            success: true,
            ...result
        });
    });
}
//# sourceMappingURL=loginLogs.js.map