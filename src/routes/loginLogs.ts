import { FastifyInstance } from 'fastify'
import * as loginActivity from '../services/loginActivity';
import { authMiddleware, onlyOrg } from '../middleware/auth';
export default async function LoginLogsRoutes(app: FastifyInstance) {

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
                type: "number",  // Will auto-convert from string
                minimum: 1,
                default: 1
            },
            limit: {
                type: "number",  // Will auto-convert from string
                minimum: 1,
                maximum: 100,
                default: 10
            }
        }
    };

    app.get(
        '/',
        {
            preHandler: [authMiddleware, onlyOrg],
            schema: {
                tags: ['auth'],
                querystring: paginationQuerySchema,
                response: loginHistoryResponseSchema
            }
        },
        async (req, reply) => {
            // Now these are already numbers!
            const { search, page, limit } = req.query as any;

            console.log('Query params:', {
                search,
                page,  // Already a number
                limit  // Already a number
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
        }
    );

    app.get(
        '/:userId',
        {
            preHandler: [authMiddleware, onlyOrg],
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
        },
        async (req, reply) => {
            const { userId } = req.params as { userId: number };
            const { search, page = 1, limit = 10 } = req.query as any;

            const result = await loginActivity.getUserLogin(userId, {
                search,
                page: Number(page),
                limit: Number(limit)
            });

            return reply.code(200).send({
                success: true,
                ...result
            });
        }
    );

}