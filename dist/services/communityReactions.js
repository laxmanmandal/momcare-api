"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleReaction = handleReaction;
exports.getReaction = getReaction;
const client_1 = __importDefault(require("../prisma/client"));
async function handleReaction({ userId, postId, commentId }) {
    const existing = await client_1.default.reaction.findFirst({
        where: { userId, postId, commentId }
    });
    if (existing) {
        if (existing.type === "LIKE") {
            // ✅ double reaction → delete
            await client_1.default.reaction.delete({ where: { id: existing.id } });
            return { message: "Reaction removed", data: null };
        }
        // ✅ update reaction type
    }
    // ✅ create new reaction
    const created = await client_1.default.reaction.create({
        data: { userId, postId, commentId }
    });
    return { message: "Reaction added", data: created };
}
async function getReaction(postId, commentId) {
    if (!postId && !commentId) {
        throw new Error('postId or commentId is required');
    }
    return client_1.default.reaction.findMany({
        where: {
            ...(postId ? { postId } : {}),
            ...(commentId ? { commentId } : {}),
            type: 'LIKE'
        },
        select: {
            User: {
                select: {
                    name: true,
                    imageUrl: true
                }
            }
        },
        orderBy: {
            created_at: 'desc'
        }
    });
}
//# sourceMappingURL=communityReactions.js.map