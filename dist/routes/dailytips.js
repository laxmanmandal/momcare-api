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
exports.default = dailytipsRoute;
const dailytipService = __importStar(require("../services/dailytipService"));
const auth_1 = require("../middleware/auth");
async function dailytipsRoute(app) {
    app.post('/', {
        schema: { tags: ['Dailytips'] },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { files, fields } = await app.parseMultipartMemory(req);
        const dailytipsData = {
            title: fields.title,
            heading: fields.heading,
            subheading: fields.subheading,
            content: fields.content,
            category: fields.category,
            creator: req.user.name
        };
        const dailytips = await dailytipService.createdailyTips(dailytipsData);
        if (files.icon?.length) {
            const icon = await app.saveFileBuffer(files.icon[0], 'daily-tips');
            await dailytipService.updatedailyTips(Number(dailytips.id), { icon });
            Object.assign(dailytips, { icon });
        }
        reply.code(200).send({
            success: true,
            message: 'dailytips created successfully',
            data: dailytips,
        });
    });
    app.patch('/:id', { schema: { tags: ['Dailytips'] }, preHandler: [auth_1.authMiddleware, auth_1.onlyOrg] }, async (req, reply) => {
        const { id } = req.params;
        // Parse form data (multipart or json)
        const { files, fields } = await app.parseMultipartMemory(req);
        if (!req.isMultipart() && req.body)
            Object.assign(fields, req.body);
        // Prepare update payload
        const updateData = {
            title: fields.title,
            heading: fields.heading,
            subheading: fields.subheading,
            content: fields.content,
            category: fields.category,
        };
        // Handle thumbnail upload (if provided)
        if (files.icon?.length) {
            updateData.icon = await app.saveFileBuffer(files.icon[0], `daily-tips`);
        }
        // Update database record
        const updateddailytips = await dailytipService.updatedailyTips(Number(id), updateData);
        reply.code(200).send({
            success: true,
            message: 'dailytips updated successfully',
            data: updateddailytips,
        });
    });
    app.get('/', { schema: { tags: ['Dailytips'] }, preHandler: [auth_1.authMiddleware] }, async (req, reply) => {
        const dailytips = await dailytipService.getdailyTips();
        reply.code(200).send({
            success: true,
            message: 'dailytips fetched successfully',
            data: dailytips,
        });
    });
    app.get('/:id', { schema: { tags: ['Dailytips'] }, preHandler: [auth_1.authMiddleware] }, async (req, reply) => {
        const { id } = req.params;
        const numericId = Number(id);
        if (isNaN(numericId)) {
            return reply.code(500).send({
                success: false,
                message: 'Invalid ID',
            });
        }
        const dailytips = await dailytipService.getdailyTipsById(numericId);
        reply.code(200).send({
            success: true,
            message: 'dailytips fetched successfully',
            data: dailytips,
        });
    });
    app.patch('/:id/status', { schema: { tags: ['Dailytips'] }, preHandler: [auth_1.authMiddleware, auth_1.onlyOrg] }, async (req, reply) => {
        const { id } = req.params;
        const dailytips = await dailytipService.dailyTipsStatus(id);
        return reply.send({ success: true, message: 'Dailytips status updated successfully', data: dailytips });
    });
}
//# sourceMappingURL=dailytips.js.map