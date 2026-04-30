import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import prisma from '../prisma/client';
import * as userService from '../services/userService';
import { verifyToken } from '../utils/jwt';
import { handlePrismaDuplicate } from '../utils/prisma-error';
import {
  validateRequest,
  validateData,
  usersListParamsSchema,
  usersListQuerySchema,
  usersListByRoleParamsSchema,
  usersByEntityParamsSchema,
  userStatusParamsSchema,
  userUpdateBodySchema
} from '../validations';
import { zodToJsonSchema } from 'zod-to-json-schema'
import type {
  UsersListParams,
  UsersListQuery,
  UsersListByRoleParams,
  UsersByEntityParams,
  UserStatusParams,
  UserUpdateBody
} from '../validations';

const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' }
  }
} as const

export default async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)
  // GET /me
  app.get('/me',
    {
      preHandler: [authMiddleware, app.accessControl.check('VIEW_OWN_PROFILE')],
      schema: { tags: ['Users'] }
    },
    async (req: any, reply: FastifyReply) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return reply.status(401).send({ error: 'No token provided' });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded: any = verifyToken(token);

        const user = await prisma.user.findUnique({
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

        const roleCounts = await prisma.entityTable.groupBy({
          by: ['type'],
          where: isAdmin ? {} : { belongsToId: decoded.belongsToId },
          _count: { type: true }
        });
        const formattedCounts = roleCounts.reduce((acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {} as Record<string, number>);

        return reply.send({
          ...user,
          memberCounts: formattedCounts
        });


      } catch (err: any) {
        console.log(err.message);
        app.log.error(err);
        return reply.status(401).send({ error: 'Invalid token' });
      }
    });

  // GET /get user list
  app.get(
    '/list/:entityId',
    {
      preHandler: [
        authMiddleware,
        app.accessControl.check('LIST_USER'),
        validateRequest(usersListParamsSchema, 'params'),
        validateRequest(usersListQuerySchema, 'query')
      ],
      schema: {
        tags: ['Users'],
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
                  isActive: { oneOf: [{ type: 'string' }, { type: 'boolean' }] }
                }
              }
            }
          }
        }
      }
    },

    async (req: any) => {
      const { entityId } = req.validated?.params as UsersListParams;
      const query = req.validated?.query as UsersListQuery;

      const result = await userService.getUsers(
        entityId,
        req.user,
        query
      );

      return {
        success: true,
        message: 'Users fetched successfully',
        ...result
      };
    }
  );



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
  app.get(
    '/list/:entityId/:role',
    {
      preHandler: [
        authMiddleware,
        app.accessControl.check('LIST_USER'),
        validateRequest(usersListByRoleParamsSchema, 'params')
      ],
      schema: {
        tags: ['Users'],
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
    },

    async (req: any) => {
      const { entityId, role } = req.validated?.params as UsersListByRoleParams;
      return userService.getRoleWise(entityId, role, req.user);
    }
  );
  app.get(
    '/entity/:entityId',
    {
      schema: {
        tags: ['Users']
      },
      preHandler: [
        authMiddleware,
        validateRequest(usersByEntityParamsSchema, 'params')
      ]
    },
    async (req: FastifyRequest) => {
      const { entityId } = req.validated?.params as UsersByEntityParams;
      return userService.getBelongsUser(entityId);
    }
  );

  // PATCH /:uuid/status  (toggle active/inactive)
  app.patch(
    '/:uuid/status',
    {
      preHandler: [
        authMiddleware,
        app.accessControl.check('UPDATE_USER_STATUS'),
        validateRequest(userStatusParamsSchema, 'params')
      ],
      schema: {
        tags: ['Users'],
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
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { uuid } = req.validated?.params as UserStatusParams;
      const updated = await userService.activeInactive(uuid);
      return reply.send({
        success: true,
        message: 'User status updated successfully',
        data: updated
      });
    }
  );

  // PATCH /:uuid/update  (update user)
  app.patch(
    '/update',
    {
      preHandler: [
        authMiddleware,
        app.accessControl.check('UPDATE_USER'),
      ],
      schema: {
        tags: ['Users'],
        consumes: ['application/json', 'multipart/form-data'],
        body: zodToJsonSchema(userUpdateBodySchema as any, { target: 'openApi3' }),
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
    },
    async (req: any, reply) => {

      // Get logged-in user's UUID from authMiddleware
      const uuid = req.user?.uuid;
      if (!uuid) {
        return reply.code(401).send({
          success: false,
          message: 'Unauthorized: missing uuid in auth payload',
        });
      }

      let fields: any = {};
      let files: any = {};

      // CASE 1: Multipart/form-data request
      if (req.isMultipart()) {
        const mp = await app.parseMultipartMemory(req);
        fields = validateData(userUpdateBodySchema, mp.fields || {});
        files = mp.files || {};
      }

      // CASE 2: JSON request
      else {
        fields = validateData(userUpdateBodySchema, req.body || {});
      }

      // Build only allowed update fields
      const updateData: any = {};
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

        if (!(key in fields)) continue;

        const value = fields[key];

        /* ───────── EMAIL (optional, unique, nullable) ───────── */
        if (key === 'email') {
          // if email key exists but value is empty → set NULL
          if (value === null || value === '' || value === undefined) {
            updateData.email = null;
            continue;
          }

          // uniqueness check (exclude same user)
          const emailExists = await prisma.user.findFirst({
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
          } else if (!isNaN(Date.parse(value))) {
            updateData[key] = new Date(value);
          } else {
            updateData[key] = new Date(value + 'T00:00:00Z');
          }
          continue;
        }

        /* ───────── OTHER FIELDS ───────── */
        updateData[key] = value;
      }



      // Handle optional image upload
      if (files.imageUrl && files.imageUrl.length > 0) {
        const savedPath = await app.saveFileBuffer(
          files.imageUrl[0],
          "user-profile"
        );
        updateData.imageUrl = savedPath;
      }

      // Update user
      const updatedUser = await userService.updateUser(uuid, updateData);

      return reply.code(200).send({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      });

    }
  );


}
