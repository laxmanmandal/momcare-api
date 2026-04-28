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
exports.default = communityComment;
const communityComments = __importStar(require("../services/communityComments"));
const auth_1 = require("../middleware/auth");
async function communityComment(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    app.post('/', {
        schema: {
            tags: ['Community Comments'],
            body: {
                type: 'object',
                required: ['postId', 'userId', 'content'],
                additionalProperties: false,
                properties: {
                    postId: { type: 'integer', minimum: 1 },
                    userId: { type: 'integer', minimum: 1 },
                    parentId: { type: 'integer', minimum: 1 },
                    content: { type: 'string' }
                }
            },
        }
    }, async (req, reply) => {
        const { postId, userId, parentId, content } = req.body;
        const comment = await communityComments.createComment({
            postId: Number(postId),
            userId: Number(userId),
            parentId: parentId ? Number(parentId) : null,
            content,
        });
        reply.code(200).send({
            success: true,
            message: 'Comment posted successfully',
            data: comment,
        });
    });
    app.patch('/:id', {
        schema: {
            tags: ['Community Comments'],
            body: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    postId: { type: 'integer', minimum: 1 },
                    userId: { type: 'integer', minimum: 1 },
                    parentId: { type: 'integer', minimum: 1 },
                    content: { type: 'string' }
                }
            },
        }
    }, async (req, reply) => {
        const { id } = req.params;
        // Parse form data (multipart or json)
        const { fields } = await app.parseMultipartMemory(req);
        if (!req.isMultipart() && req.body)
            Object.assign(fields, req.body);
        const comment = {
            content: fields.content,
        };
        const response = await communityComments.updateComment(Number(id), comment);
        reply.code(200).send({
            success: true,
            message: 'community post updated successfully',
            data: response,
        });
    });
    app.get('/:postId', {
        schema: { tags: ['Community Comments'] },
    }, async (req, reply) => {
        const { postId } = req.params;
        const numericId = Number(postId);
        console.log(postId);
        if (isNaN(numericId)) {
            return reply.code(500).send({
                success: false,
                message: 'Invalid ID',
            });
        }
        const comment = await communityComments.getNestedComments(numericId);
        reply.code(200).send({
            success: true,
            message: 'comment fetched successfully',
            data: comment,
        });
    });
    app.patch('/:id/status', { schema: { tags: ['Community Comments'] } }, async (req, reply) => {
        const { id } = req.params;
        const comment = await communityComments.CommentStatus(id);
        return reply.send({ success: true, message: 'comment removed successfully', data: comment });
    });
}
//# sourceMappingURL=communityComment.js.map