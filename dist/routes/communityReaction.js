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
exports.default = communityReaction;
const communityReactions = __importStar(require("../services/communityReactions"));
const auth_1 = require("../middleware/auth");
const zod_to_json_schema_1 = require("zod-to-json-schema");
const validations_1 = require("../validations");
async function communityReaction(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    // ✅ Create / Update / Delete Reaction
    app.post('/create', {
        schema: {
            tags: ['Community post and Comments Likes'],
            description: 'Toggle a reaction for either a post or a comment. Provide postId or commentId.',
            body: (0, zod_to_json_schema_1.zodToJsonSchema)(validations_1.communityReactionBodySchema, 'communityReactionBody')
        }
    }, async (req, reply) => {
        const { postId, commentId } = (0, validations_1.validateData)(validations_1.communityReactionBodySchema, req.body ?? {});
        const userId = (0, validations_1.validateData)(validations_1.positiveIntSchema, req.user.id);
        const result = await communityReactions.handleReaction({
            userId,
            postId: postId ?? null,
            commentId: commentId ?? null,
        });
        return reply.code(200).send({
            success: true,
            message: result.message,
            data: result.data
        });
    });
    app.get('/', {
        schema: {
            tags: ['Community post and Comments Likes'],
        }
    }, async (req, reply) => {
        const { postId, commentId } = (0, validations_1.validateData)(validations_1.communityReactionQuerySchema, req.query ?? {});
        const result = await communityReactions.getReaction(postId, commentId);
        return reply.code(200).send({
            success: true,
            data: result
        });
    });
}
//# sourceMappingURL=communityReaction.js.map