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
const validations_1 = require("../validations");
const zodFormData_1 = require("../utils/zodFormData");
const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true }
    }
};
const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object', additionalProperties: true } }
    }
};
async function dailytipsRoute(app) {
    app.post('/', {
        schema: {
            tags: ['Dailytips'],
            summary: 'Create a daily tip',
            consumes: ['multipart/form-data'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.dailyTipCreateMultipartSchema),
            requestBody: (0, zodFormData_1.zodToMultipartRequestBody)(validations_1.dailyTipCreateMultipartSchema),
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { fields, files } = (0, validations_1.validateData)(validations_1.dailyTipCreateMultipartSchema, await app.parseMultipartMemory(req));
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
    app.patch('/:id', {
        schema: {
            tags: ['Dailytips'],
            summary: 'Update a daily tip',
            consumes: ['application/json', 'multipart/form-data'],
            parameters: (0, zodFormData_1.zodToFormDataParams)(validations_1.dailyTipUpdateMultipartSchema),
            requestBody: (0, zodFormData_1.zodToMultipartRequestBody)(validations_1.dailyTipUpdateMultipartSchema),
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.dailyTipIdParamsSchema, req.params);
        const { fields, files } = (0, validations_1.validateData)(validations_1.dailyTipUpdateMultipartSchema, await app.parseMultipartMemory(req));
        const updateData = {
            title: fields.title,
            heading: fields.heading,
            subheading: fields.subheading,
            content: fields.content,
            category: fields.category
        };
        if (files.icon?.length) {
            updateData.icon = await app.saveFileBuffer(files.icon[0], `daily-tips`);
        }
        const updateddailytips = await dailytipService.updatedailyTips(id, updateData);
        reply.code(200).send({
            success: true,
            message: 'dailytips updated successfully',
            data: updateddailytips,
        });
    });
    app.get('/', {
        schema: {
            tags: ['Dailytips'],
            summary: 'List all daily tips',
            response: { 200: successArrayResponse }
        },
        preHandler: [auth_1.authMiddleware]
    }, async () => {
        const dailytips = await dailytipService.getdailyTips();
        return {
            success: true,
            message: 'dailytips fetched successfully',
            data: dailytips,
        };
    });
    app.get('/:id', {
        schema: {
            tags: ['Dailytips'],
            summary: 'Get daily tip by ID',
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware]
    }, async (req) => {
        const { id } = (0, validations_1.validateData)(validations_1.dailyTipIdParamsSchema, req.params);
        const dailytips = await dailytipService.getdailyTipsById(id);
        return {
            success: true,
            message: 'dailytips fetched successfully',
            data: dailytips,
        };
    });
    app.patch('/:id/status', {
        schema: {
            tags: ['Dailytips'],
            summary: 'Toggle daily tip status',
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.dailyTipIdParamsSchema, req.params);
        const dailytips = await dailytipService.dailyTipsStatus(id);
        return reply.send({ success: true, message: 'Dailytips status updated successfully', data: dailytips });
    });
}
//# sourceMappingURL=dailytips.js.map