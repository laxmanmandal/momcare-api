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
exports.default = healthRoutes;
const healthService = __importStar(require("../services/healthService"));
const auth_1 = require("../middleware/auth");
const client_1 = __importDefault(require("../prisma/client"));
const zodOpenApi_1 = require("../utils/zodOpenApi");
const validations_1 = require("../validations");
const successArrayResponse = {
    type: 'object',
    properties: {
        count: { type: 'integer' },
        data: { type: 'array', items: { type: 'object', additionalProperties: true } }
    }
};
const errorResponse = {
    type: 'object',
    properties: {
        error: { type: 'string' }
    }
};
async function healthRoutes(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    // Symptoms
    app.post('/symptoms', {
        schema: {
            tags: ['Health'],
            description: 'Create a symptom entry',
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            body: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.healthSymptomsSchema, { target: 'openApi3' }),
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        userId: { type: 'integer' },
                        symptoms: { type: 'array', items: { type: 'string' } },
                        created_at: { type: 'string' },
                    },
                },
                400: { type: 'object', properties: { error: { type: 'string' } } },
                500: { type: 'object', properties: { error: { type: 'string' } } }
            },
        },
    }, async (req, reply) => {
        try {
            const { symptoms } = (0, validations_1.validateData)(validations_1.healthSymptomsSchema, req.body ?? {});
            const entry = await healthService.addSymptomEntry(req.user.id, symptoms);
            return reply.status(201).send('Symptom added successfully');
        }
        catch (err) {
            req.log.error(err);
            console.log(err);
            return reply.status(500).send({ error: 'Failed to create symptom entry' });
        }
    });
    app.get('/symptoms', {
        schema: {
            tags: ['Health'],
            summary: 'List the authenticated user symptom entries from the last 30 days',
            response: { 200: successArrayResponse, 500: errorResponse }
        }, preHandler: [auth_1.authMiddleware]
    }, async (request, reply) => {
        try {
            // Get current date and subtract 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            // Query records created in the last 30 days
            const records = await client_1.default.symptomEntry.findMany({
                where: {
                    userId: request.user.id,
                    created_at: {
                        gte: thirtyDaysAgo,
                    },
                },
                select: {
                    symptoms: true,
                    created_at: true,
                },
                orderBy: {
                    created_at: 'desc', // optional: newest first
                },
            });
            return reply.send({
                count: records.length,
                data: records,
            });
        }
        catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    });
}
//# sourceMappingURL=health.js.map