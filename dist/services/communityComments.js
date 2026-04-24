"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComments = getComments;
exports.getCommentsByPostId = getCommentsByPostId;
exports.getNestedComments = getNestedComments;
exports.createComment = createComment;
exports.updateComment = updateComment;
exports.CommentStatus = CommentStatus;
const client_1 = __importDefault(require("../prisma/client"));
async function getComments() {
    return client_1.default.comment.findMany();
}
/* Fetch all comments of a post (flat) */
async function getCommentsByPostId(postId) {
    return client_1.default.comment.findMany({
        where: { postId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    imageUrl: true
                }
            },
            _count: {
                select: {
                    Reaction: true, // 👈 likes count
                    replies: true
                }
            }
        },
        orderBy: { created_at: 'desc' }
    });
}
/* Convert flat list to nested tree */
function nestComments(comments) {
    const map = new Map();
    const roots = [];
    comments.forEach(c => map.set(c.id, { ...c, replies: [] }));
    comments.forEach(c => {
        if (c.parentId) {
            map.get(c.parentId)?.replies.push(map.get(c.id));
        }
        else {
            roots.push(map.get(c.id));
        }
    });
    return roots;
}
/* Public function used by routes */
async function getNestedComments(postId) {
    const comments = await getCommentsByPostId(postId);
    return nestComments(comments);
}
async function createComment(data) {
    return client_1.default.comment.create({ data });
}
async function updateComment(id, data) {
    const existing = await client_1.default.comment.findUnique({ where: { id } });
    if (!existing)
        throw new Error('community comment not found');
    return client_1.default.comment.update({ where: { id }, data });
}
async function CommentStatus(id) {
    const comment = await client_1.default.comment.findUnique({ where: { id } });
    if (!comment)
        throw new Error("Community comment not found");
    return client_1.default.comment.update({
        where: { id },
        data: { isActive: !comment.isActive },
    });
}
// comments reply 
//# sourceMappingURL=communityComments.js.map