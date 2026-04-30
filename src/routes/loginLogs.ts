import { FastifyInstance } from 'fastify'
import * as loginActivity from '../services/loginActivity';
import { authMiddleware, onlyOrg } from '../middleware/auth';
import { loginLogParamsSchema, loginLogQuerySchema, validateData } from '../validations';
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
                response: loginHistoryResponseSchema
            }
        },
        async (req, reply) => {
            const { search, page, limit } = validateData(loginLogQuerySchema, req.query ?? {});

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
                response: loginHistoryResponseSchema
            }
        },
        async (req, reply) => {
            const { userId } = validateData(loginLogParamsSchema, req.params);
            const { search, page, limit } = validateData(loginLogQuerySchema, req.query ?? {});

            const result = await loginActivity.getUserLogin(userId, {
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

}
