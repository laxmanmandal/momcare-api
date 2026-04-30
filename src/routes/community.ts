import { FastifyInstance } from "fastify";
import * as communityService from "../services/communityService";
import { authMiddleware, onlyOrg } from "../middleware/auth";
import { zodToJsonSchema } from "../utils/zodOpenApi";
import {
  communityCreateMultipartSchema,
  communityIdParamsSchema,
  communityJoinSchema,
  communityUpdateMultipartSchema,
  positiveIntSchema,
  validateData,
} from "../validations";

const communityResponse = {
  type: "object",
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    description: { type: "string", nullable: true },
    imageUrl: { type: "string", nullable: true },
    isActive: { type: "boolean" },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
  },
} as const;

export default async function community(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.post(
    "/",
    {
      schema: {
        tags: ["Community"],
        consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
        body: zodToJsonSchema(communityCreateMultipartSchema as any, { target: 'openApi3' }),
        response: {
          201: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: communityResponse,
            },
          },
        },
      },
      preHandler: [onlyOrg],
    },
    async (req, reply) => {
      const { fields, files } = validateData(
        communityCreateMultipartSchema,
        await app.parseMultipartMemory(req),
      );

      const community = {
        name: fields.name,
        description: fields.description,
      };

      const communityData = await communityService.createCommunity(community);

      if (files.imageUrl?.length) {
        const imageUrl = await app.saveFileBuffer(
          files.imageUrl[0],
          "_community",
        );
        await communityService.updateCommunity(Number(communityData.id), {
          imageUrl,
        });
        Object.assign(communityData, { imageUrl });
      }

      reply.code(201).send({
        success: true,
        message: "Community created successfully",
        data: communityData,
      });
    },
  );

  app.patch(
    "/:id",
    {
      schema: {
        tags: ["Community"],
        consumes: ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
        params: zodToJsonSchema(communityIdParamsSchema as any, { target: 'openApi3' }),
        body: zodToJsonSchema(communityUpdateMultipartSchema as any, { target: 'openApi3' }),
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: communityResponse,
            },
          },
        },
      },
      preHandler: [onlyOrg],
    },
    async (req, reply) => {
      const { id } = validateData(communityIdParamsSchema, req.params);

      // Parse form data (multipart or json)
      const { fields, files } = validateData(
        communityUpdateMultipartSchema,
        await app.parseMultipartMemory(req),
      );

      const community: {
        name?: string;
        description?: string;
        imageUrl?: string;
      } = {
        name: fields.name,
        description: fields.description,
      };

      // Handle thumbnail upload (if provided)
      if (files.imageUrl?.length) {
        community.imageUrl = await app.saveFileBuffer(
          files.imageUrl[0],
          `_community`,
        );
      }
      // Update database record
      const communityData = await communityService.updateCommunity(
        id,
        community,
      );

      reply.code(200).send({
        success: true,
        message: "community updated successfully",
        data: communityData,
      });
    },
  );
  app.get(
    "/",
    {
      schema: {
        tags: ["Community"],
        params: {
          type: "object",
          properties: {
            id: { type: "integer", description: "Community ID" },
          },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: { type: "array", items: communityResponse },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const communities = await communityService.getCommunity();
      reply.code(200).send({
        success: true,
        message: "community fetched successfully",
        data: communities,
      });
    },
  );
  app.get(
    "/:id",
    {
      schema: {
        tags: ["Community"],
        params: {
          type: "object",
          properties: {
            id: { type: "integer", description: "Community ID" },
          },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: communityResponse,
            },
          },
        },
      },
    },

    async (req, reply) => {
      const { id } = validateData(communityIdParamsSchema, req.params);

      const community = await communityService.getCommunityById(id);

      reply.code(200).send({
        success: true,
        message: "community fetched successfully",
        data: community,
      });
    },
  );
  app.patch(
    "/:id/status",
    {
      schema: {
        tags: ["Community"],
        consumes: ['application/json', 'application/x-www-form-urlencoded'],
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: communityResponse,
            },
          },
        },
      },
      preHandler: [onlyOrg],
    },
    async (req, reply) => {
      const { id } = validateData(communityIdParamsSchema, req.params);
      const community = await communityService.CommunityStatus(id);
      return reply.send({
        success: true,
        message: "Community status updated successfully",
        data: community,
      });
    },
  );

  app.post(
    "/join",
    {
      schema: {
        tags: ["Community"],
        consumes: ['application/json', 'application/x-www-form-urlencoded'],
        body: zodToJsonSchema(communityJoinSchema as any, { target: 'openApi3' }),
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              subscribed: { type: "boolean" },
              data: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const { userId, communityId } = validateData(
        communityJoinSchema,
        req.body ?? {},
      );
      const authenticatedUserId = validateData(positiveIntSchema, req.user?.id);

      if (userId !== undefined && userId !== authenticatedUserId) {
        throw Object.assign(
          new Error("You cannot join a community for another user"),
          {
            statusCode: 403,
            code: "FORBIDDEN",
          },
        );
      }

      const result = await communityService.handleCommunityJoin({
        userId: authenticatedUserId,
        communityId,
      });

      return reply.code(200).send({
        success: true,
        message: result.message,
        subscribed: result.subscribed,
        data: result.data,
      });
    },
  );
}
