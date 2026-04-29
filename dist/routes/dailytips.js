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
const idParamsSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: {
        id: { type: 'integer', minimum: 1 }
    }
};
const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object' }
    }
};
const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object' } }
    }
};
const dailyTipsBody = {
    type: 'object',
    additionalProperties: false,
    properties: {
        title: { type: 'string' },
        heading: { type: 'string' },
        subheading: { type: 'string' },
        content: { type: 'string' },
        category: { type: 'string' },
        icon: { type: 'string', contentEncoding: 'binary' }
    }
};
async function dailytipsRoute(app) {
    app.post('/', {
        schema: {
            tags: ['Dailytips'],
            summary: 'Create a daily tip',
            consumes: ['multipart/form-data'],
            body: dailyTipsBody,
            response: { 200: successObjectResponse }
        },
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
    app.patch('/:id', {
        schema: {
            tags: ['Dailytips'],
            summary: 'Update a daily tip',
            consumes: ['application/json', 'multipart/form-data'],
            params: idParamsSchema,
            body: dailyTipsBody,
            response: { 200: successObjectResponse }
        }, preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = req.params;
        let fields = {};
        let files = {};
        if (req.isMultipart()) {
            ({ files, fields } = await app.parseMultipartMemory(req));
        }
        else {
            fields = req.body || {};
        }
        const updateData = {
            title: fields.title,
            heading: fields.heading,
            subheading: fields.subheading,
            content: fields.content,
            category: fields.category,
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
    }, async (req, reply) => {
        const dailytips = await dailytipService.getdailyTips();
        reply.code(200).send({
            success: true,
            message: 'dailytips fetched successfully',
            data: dailytips,
        });
    });
    app.get('/:id', {
        schema: {
            tags: ['Dailytips'],
            summary: 'Get daily tip by ID',
            params: idParamsSchema,
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware]
    }, async (req, reply) => {
        const { id } = req.params;
        const dailytips = await dailytipService.getdailyTipsById(id);
        reply.code(200).send({
            success: true,
            message: 'dailytips fetched successfully',
            data: dailytips,
        });
    });
    app.patch('/:id/status', {
        schema: {
            tags: ['Dailytips'],
            summary: 'Toggle daily tip status',
            params: idParamsSchema,
            response: { 200: successObjectResponse }
        },
        preHandler: [auth_1.authMiddleware, auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = req.params;
        const dailytips = await dailytipService.dailyTipsStatus(id);
        return reply.send({ success: true, message: 'Dailytips status updated successfully', data: dailytips });
    });
}
//# sourceMappingURL=dailytips.js.map