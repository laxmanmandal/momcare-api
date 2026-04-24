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
async function community(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    app.post('/', {
        schema: { tags: ['Community'] },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { files, fields } = await app.parseMultipartMemory(req);
        console.log('✅ Parsed multipart fields:', fields);
        console.log('✅ Parsed multipart files:', files);
        const community = {
            name: fields.name,
            description: fields.description,
        };
        const communityData = await communityService.createCommunity(community);
        if (files.imageUrl?.length) {
            const imageUrl = await app.saveFileBuffer(files.imageUrl[0], '_community');
            await communityService.updateCommunity(Number(communityData.id), { imageUrl });
            Object.assign(communityData, { imageUrl });
        }
        reply.code(200).send({
            success: true,
            message: 'Community created successfully',
            data: communityData,
        });
    });
    app.patch('/:id', {
        schema: { tags: ['Community'] },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = req.params;
        // Parse form data (multipart or json)
        const { files, fields } = await app.parseMultipartMemory(req);
        if (!req.isMultipart() && req.body)
            Object.assign(fields, req.body);
        // Prepare update payload
        const community = {
            name: fields.name,
            description: fields.description,
        };
        // Handle thumbnail upload (if provided)
        if (files.imageUrl?.length) {
            community.imageUrl = await app.saveFileBuffer(files.imageUrl[0], `_community`);
        }
        // Update database record
        const communityData = await communityService.updateCommunity(Number(id), community);
        reply.code(200).send({
            success: true,
            message: 'community updated successfully',
            data: communityData,
        });
    });
    app.get('/', { schema: { tags: ['Community'] } }, async (req, reply) => {
        const communities = await communityService.getCommunity();
        reply.code(200).send({
            success: true,
            message: 'community fetched successfully',
            data: communities,
        });
    });
    app.get('/:id', { schema: { tags: ['Community'] } }, async (req, reply) => {
        const { id } = req.params;
        const numericId = Number(id);
        if (isNaN(numericId)) {
            return reply.code(500).send({
                success: false,
                message: 'Invalid ID',
            });
        }
        const community = await communityService.getCommunityById(numericId);
        reply.code(200).send({
            success: true,
            message: 'community fetched successfully',
            data: community,
        });
    });
    app.patch('/:id/status', { schema: { tags: ['Community'] }, preHandler: [auth_1.onlyOrg] }, async (req, reply) => {
        const { id } = req.params;
        const community = await communityService.CommunityStatus(id);
        return reply.send({ success: true, message: 'Community status updated successfully', data: community });
    });
    app.post('/join', { schema: { tags: ['Community'] } }, async (req, reply) => {
        console.log(req.body);
        const { userId, communityId } = req.body ?? {};
        if (!userId || !communityId) {
            return reply.code(400).send({
                success: false,
                message: "userId and communityId are required"
            });
        }
        const result = await communityService.handleCommunityJoin({
            userId: Number(userId),
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