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
exports.default = ExpertRoutes;
const expertService = __importStar(require("../services/expertService"));
const auth_1 = require("../middleware/auth");
async function ExpertRoutes(app) {
    app.post('/', { schema: { tags: ['Experts'] }, preHandler: [auth_1.authMiddleware, auth_1.onlyOrg] }, async (req, reply) => {
        const { files, fields } = await app.parseMultipartMemory(req);
        const expertsData = {
            name: fields.name,
            profession_id: Number(fields.profession_id),
            name_org: fields.name_org,
            qualification: fields.qualification,
        };
        const expert = await expertService.createExperts(expertsData);
        if (files.image?.length) {
            const image = await app.saveFileBuffer(files.image[0], '_experts');
            await expertService.updateexperts(Number(expert.id), { image });
            Object.assign(expert, { image });
        }
        reply.code(200).send({
            success: true,
            message: 'Expert created successfully',
            data: expert,
        });
    });
    app.patch('/:id', { schema: { tags: ['Experts'] }, preHandler: [auth_1.authMiddleware, auth_1.onlyOrg] }, async (req, reply) => {
        const { id } = req.params;
        // Parse form data (multipart or json)
        const { files, fields } = await app.parseMultipartMemory(req);
        if (!req.isMultipart() && req.body)
            Object.assign(fields, req.body);
        // Prepare update payload
        const updateData = {
            name: fields.name,
            profession_id: Number(fields.profession_id),
            name_org: fields.name_org,
            qualification: fields.qualification,
        };
        // Handle thumbnail upload (if provided)
        if (files.image?.length) {
            updateData.image = await app.saveFileBuffer(files.image[0], `_experts`);
        }
        // Update database record
        const updatedExpert = await expertService.updateexperts(Number(id), updateData);
        reply.code(200).send({
            success: true,
            message: 'Expert updated successfully',
            data: updatedExpert,
        });
    });
    app.get('/', { schema: { tags: ['Experts'] }, preHandler: [auth_1.authMiddleware] }, async (req, reply) => {
        const Expert = await expertService.getexperts();
        reply.code(200).send({
            success: true,
            message: 'Expert fetched successfully',
            data: Expert,
        });
    });
    app.get('/:id', { schema: { tags: ['Experts'] }, preHandler: [auth_1.authMiddleware] }, async (req, reply) => {
        const { id } = req.params;
        const numericId = Number(id);
        if (isNaN(numericId)) {
            return reply.code(500).send({
                success: false,
                message: 'Invalid ID',
            });
        }
        const Expert = await expertService.getexpertsById(numericId);
        reply.code(200).send({
            success: true,
            message: 'Expert fetched successfully',
            data: Expert,
        });
    });
}
//# sourceMappingURL=expertRoute.js.map