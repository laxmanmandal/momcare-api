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
exports.default = community;
const communityService = __importStar(require("../services/communityService"));
const auth_1 = require("../middleware/auth");
const http_errors_1 = __importDefault(require("http-errors"));
const requestValidation_1 = require("../utils/requestValidation");
const communityCreateBody = {
    type: 'object',
    additionalProperties: false,
    required: ['name'],
    properties: {
        name: { type: 'string', minLength: 2, maxLength: 120 },
        description: { type: 'string', maxLength: 1000 },
        imageUrl: { type: 'string', contentEncoding: 'binary' }
    }
};
const communityUpdateBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        name: { type: 'string', minLength: 2, maxLength: 120 },
        description: { type: 'string', maxLength: 1000 },
        imageUrl: { type: 'string', contentEncoding: 'binary' }
    }
};
const idParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: {
        id: { type: 'integer', minimum: 1 }
    }
};
const communityResponse = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        description: { type: 'string', nullable: true },
        imageUrl: { type: 'string', nullable: true },
        isActive: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
    }
};
async function community(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    app.post('/', {
        schema: {
            tags: ['Community'],
            consumes: ['multipart/form-data'],
            body: communityCreateBody,
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: communityResponse
                    }
                }
            }
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { files, fields } = await app.parseMultipartMemory(req);
        (0, requestValidation_1.assertAllowedKeys)(fields, ['name', 'description']);
        (0, requestValidation_1.assertAllowedFileFields)(files, ['imageUrl']);
        const community = {
            name: (0, requestValidation_1.readString)(fields, 'name', { required: true, minLength: 2, maxLength: 120 }),
            description: (0, requestValidation_1.readString)(fields, 'description', { maxLength: 1000 }),
        };
        const communityData = await communityService.createCommunity(community);
        if (files.imageUrl?.length) {
            const imageUrl = await app.saveFileBuffer(files.imageUrl[0], '_community');
            await communityService.updateCommunity(Number(communityData.id), { imageUrl });
            Object.assign(communityData, { imageUrl });
        }
        reply.code(201).send({
            success: true,
            message: 'Community created successfully',
            data: communityData,
        });
    });
    app.patch('/:id', {
        schema: {
            tags: ['Community'],
            consumes: ['application/json', 'multipart/form-data'],
            params: idParamsSchema,
            body: communityUpdateBody,
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: communityResponse
                    }
                }
            }
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = req.params;
        // Parse form data (multipart or json)
        const { files, fields } = await app.parseMultipartMemory(req);
        (0, requestValidation_1.assertAllowedKeys)(fields, ['name', 'description']);
        (0, requestValidation_1.assertAllowedFileFields)(files, ['imageUrl']);
        // Prepare update payload
        const community = (0, requestValidation_1.pickDefined)({
            name: (0, requestValidation_1.readString)(fields, 'name', { minLength: 2, maxLength: 120 }),
            description: (0, requestValidation_1.readString)(fields, 'description', { maxLength: 1000 }),
        });
        if (Object.keys(community).length === 0 && !files.imageUrl?.length) {
            throw (0, http_errors_1.default)(400, 'At least one field is required');
        }
        // Handle thumbnail upload (if provided)
        if (files.imageUrl?.length) {
            community.imageUrl = await app.saveFileBuffer(files.imageUrl[0], `_community`);
        }
        // Update database record
        const communityData = await communityService.updateCommunity(id, community);
        reply.code(200).send({
            success: true,
            message: 'community updated successfully',
            data: communityData,
        });
    });
    app.get('/', {
        schema: {
            tags: ['Community'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: { type: 'array', items: communityResponse }
                    }
                }
            }
        }
    }, async (req, reply) => {
        const communities = await communityService.getCommunity();
        reply.code(200).send({
            success: true,
            message: 'community fetched successfully',
            data: communities,
        });
    });
    app.get('/:id', {
        schema: {
            tags: ['Community'],
            params: idParamsSchema,
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: communityResponse
                    }
                }
            }
        }
    }, async (req, reply) => {
        const { id } = req.params;
        const community = await communityService.getCommunityById(id);
        reply.code(200).send({
            success: true,
            message: 'community fetched successfully',
            data: community,
        });
    });
    app.patch('/:id/status', {
        schema: {
            tags: ['Community'],
            params: idParamsSchema,
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: communityResponse
                    }
                }
            }
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = req.params;
        const community = await communityService.CommunityStatus(id);
        return reply.send({ success: true, message: 'Community status updated successfully', data: community });
    });
    app.post('/join', {
        schema: {
            tags: ['Community'],
            body: {
                type: 'object',
                additionalProperties: false,
                required: ['communityId'],
                properties: {
                    userId: { type: 'integer', minimum: 1 },
                    communityId: { type: 'integer', minimum: 1 }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        subscribed: { type: 'boolean' },
                        data: { type: 'object', additionalProperties: true }
                    }
                }
            }
        }
    }, async (req, reply) => {
        const { userId, communityId } = req.body ?? {};
        const authenticatedUserId = (0, requestValidation_1.readIdParam)(req.user?.id, 'userId');
        if (userId !== undefined && Number(userId) !== authenticatedUserId) {
            throw (0, http_errors_1.default)(403, 'You cannot join a community for another user');
        }
        const result = await communityService.handleCommunityJoin({
            userId: authenticatedUserId,
            communityId: Number(communityId)
        });
        return reply.code(200).send({
            success: true,
            message: result.message,
            subscribed: result.subscribed,
            data: result.data
        });
    });
}
//# sourceMappingURL=community.js.map