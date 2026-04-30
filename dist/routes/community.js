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
exports.default = community;
const communityService = __importStar(require("../services/communityService"));
const auth_1 = require("../middleware/auth");
const validations_1 = require("../validations");
const zodFormData_1 = require("../utils/zodFormData");
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
};
async function community(app) {
    app.addHook("preHandler", auth_1.authMiddleware);
    app.post("/", {
        schema: {
            tags: ["Community"],
            consumes: ["multipart/form-data"],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.communityCreateMultipartSchema),
            body: {
                properties: {
                    name: { type: "string", description: "Name of the community" },
                    description: { type: "string", description: "Description of the community" },
                    imageUrl: { type: "string", format: "binary", description: "Community image" },
                },
            },
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
        preHandler: [auth_1.onlyOrg],
    }, async (req, reply) => {
        const { fields, files } = (0, validations_1.validateData)(validations_1.communityCreateMultipartSchema, await app.parseMultipartMemory(req));
        const community = {
            name: fields.name,
            description: fields.description,
        };
        const communityData = await communityService.createCommunity(community);
        if (files.imageUrl?.length) {
            const imageUrl = await app.saveFileBuffer(files.imageUrl[0], "_community");
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
    });
    app.patch("/:id", {
        schema: {
            tags: ["Community"],
            consumes: ["application/json", "multipart/form-data"],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.communityUpdateMultipartSchema),
            params: {
                type: "object",
                properties: {
                    id: { type: "integer", description: "Community ID" },
                },
                required: ["id"],
            },
            body: {
                properties: {
                    name: { type: "string", description: "Name of the community" },
                    description: { type: "string", description: "Description of the community" },
                    imageUrl: { type: "string", format: "binary", description: "Community image" },
                },
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
        preHandler: [auth_1.onlyOrg],
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.communityIdParamsSchema, req.params);
        // Parse form data (multipart or json)
        const { fields, files } = (0, validations_1.validateData)(validations_1.communityUpdateMultipartSchema, await app.parseMultipartMemory(req));
        const community = {
            name: fields.name,
            description: fields.description,
        };
        // Handle thumbnail upload (if provided)
        if (files.imageUrl?.length) {
            community.imageUrl = await app.saveFileBuffer(files.imageUrl[0], `_community`);
        }
        // Update database record
        const communityData = await communityService.updateCommunity(id, community);
        reply.code(200).send({
            success: true,
            message: "community updated successfully",
            data: communityData,
        });
    });
    app.get("/", {
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
    }, async (req, reply) => {
        const communities = await communityService.getCommunity();
        reply.code(200).send({
            success: true,
            message: "community fetched successfully",
            data: communities,
        });
    });
    app.get("/:id", {
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
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.communityIdParamsSchema, req.params);
        const community = await communityService.getCommunityById(id);
        reply.code(200).send({
            success: true,
            message: "community fetched successfully",
            data: community,
        });
    });
    app.patch("/:id/status", {
        schema: {
            tags: ["Community"],
            body: {
                type: "object",
                properties: {
                    communityId: { type: "integer", description: "ID of the community to join" },
                    userId: { type: "integer", description: "ID of the user (optional)" },
                },
                required: ["communityId"],
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
        preHandler: [auth_1.onlyOrg],
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.communityIdParamsSchema, req.params);
        const community = await communityService.CommunityStatus(id);
        return reply.send({
            success: true,
            message: "Community status updated successfully",
            data: community,
        });
    });
    app.post("/join", {
        schema: {
            tags: ["Community"],
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
    }, async (req, reply) => {
        const { userId, communityId } = (0, validations_1.validateData)(validations_1.communityJoinSchema, req.body ?? {});
        const authenticatedUserId = (0, validations_1.validateData)(validations_1.positiveIntSchema, req.user?.id);
        if (userId !== undefined && userId !== authenticatedUserId) {
            throw Object.assign(new Error("You cannot join a community for another user"), {
                statusCode: 403,
                code: "FORBIDDEN",
            });
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
    });
}
//# sourceMappingURL=community.js.map