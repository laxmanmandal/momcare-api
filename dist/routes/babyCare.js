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
exports.default = babyCareRoutes;
const babyCareService = __importStar(require("../services/babyCareService"));
const auth_1 = require("../middleware/auth");
const zodOpenApi_1 = require("../utils/zodOpenApi");
const validations_1 = require("../validations");
const successObjectResponse = {
    type: "object",
    properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: { type: "object", additionalProperties: true },
    },
};
const successArrayResponse = {
    type: "object",
    properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
            type: "array",
            items: { type: "object", additionalProperties: true },
        },
    },
};
const successDeleteResponse = {
    type: "object",
    properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: { type: "object", additionalProperties: true },
    },
};
async function babyCareRoutes(app) {
    app.addHook("preHandler", auth_1.authMiddleware);
    app.get("/profiles", {
        schema: {
            tags: ["Baby Care"],
            summary: "List all baby profiles",
            response: { 200: successArrayResponse },
        },
    }, async () => ({
        success: true,
        message: "Baby profiles fetched successfully",
        data: await babyCareService.getBabyProfiles(),
    }));
    app.get("/profiles/user/:userId", {
        schema: {
            tags: ["Baby Care"],
            summary: "List baby profiles by user ID",
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.babyProfileUserIdParamsSchema, { target: "openApi3" }),
            response: { 200: successArrayResponse },
        },
    }, async (req) => {
        const { userId } = (0, validations_1.validateData)(validations_1.babyProfileUserIdParamsSchema, req.params);
        return {
            success: true,
            message: "Baby profiles fetched successfully",
            data: await babyCareService.getBabyProfilesByUserId(userId),
        };
    });
    app.get("/profiles/:id", {
        schema: {
            tags: ["Baby Care"],
            summary: "Get baby profile by ID",
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.babyIdParamsSchema, { target: "openApi3" }),
            response: { 200: successObjectResponse },
        },
    }, async (req) => {
        const { id } = (0, validations_1.validateData)(validations_1.babyIdParamsSchema, req.params);
        return {
            success: true,
            message: "Baby profile fetched successfully",
            data: await babyCareService.getBabyProfileById(id),
        };
    });
    app.post("/profiles", {
        schema: {
            tags: ["Baby Care"],
            summary: "Create baby profile",
            consumes: ["application/json", "application/x-www-form-urlencoded"],
            body: (0, validations_1.zodToSwagger)(validations_1.babyProfileCreateSchema),
            response: { 201: successObjectResponse },
        },
    }, async (req, reply) => {
        const body = (0, validations_1.validateData)(validations_1.babyProfileCreateSchema, req.body);
        const userId = body.userId ?? Number(req.user.id);
        const data = await babyCareService.createBabyProfile({
            ...body,
            userId,
        });
        return reply.code(201).send({
            success: true,
            message: "Baby profile created successfully",
            data,
        });
    });
    app.patch("/profiles/:id", {
        schema: {
            tags: ["Baby Care"],
            summary: "Update baby profile",
            consumes: ["application/json", "application/x-www-form-urlencoded"],
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.babyIdParamsSchema, { target: "openApi3" }),
            body: (0, validations_1.zodToSwagger)(validations_1.babyProfileUpdateSchema),
            response: { 200: successObjectResponse },
        },
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.babyIdParamsSchema, req.params);
        const body = (0, validations_1.validateData)(validations_1.babyProfileUpdateSchema, req.body);
        return reply.send({
            success: true,
            message: "Baby profile updated successfully",
            data: await babyCareService.updateBabyProfile(id, body),
        });
    });
    app.delete("/profiles/:id", {
        schema: {
            tags: ["Baby Care"],
            summary: "Delete baby profile",
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.babyIdParamsSchema, { target: "openApi3" }),
            response: { 200: successDeleteResponse },
        },
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.babyIdParamsSchema, req.params);
        return reply.send({
            success: true,
            message: "Baby profile deleted successfully",
            data: await babyCareService.deleteBabyProfile(id),
        });
    });
    registerBabyLogRoutes({
        app,
        tag: "Baby Care",
        childPath: "vaccinations",
        itemPath: "vaccination-logs",
        createSchema: validations_1.vaccinationLogCreateSchema,
        updateSchema: validations_1.vaccinationLogUpdateSchema,
        createMessage: "Vaccination log created successfully",
        updateMessage: "Vaccination log updated successfully",
        deleteMessage: "Vaccination log deleted successfully",
        fetchMessage: "Vaccination logs fetched successfully",
        getByBabyId: babyCareService.getVaccinationLogsByBabyId,
        getById: babyCareService.getVaccinationLogById,
        create: babyCareService.createVaccinationLog,
        update: babyCareService.updateVaccinationLog,
        remove: babyCareService.deleteVaccinationLog,
    });
    registerBabyLogRoutes({
        app,
        tag: "Baby Care",
        childPath: "motor-skills",
        itemPath: "motor-skill-logs",
        createSchema: validations_1.motorSkillLogCreateSchema,
        updateSchema: validations_1.motorSkillLogUpdateSchema,
        createMessage: "Motor skill log created successfully",
        updateMessage: "Motor skill log updated successfully",
        deleteMessage: "Motor skill log deleted successfully",
        fetchMessage: "Motor skill logs fetched successfully",
        getByBabyId: babyCareService.getMotorSkillLogsByBabyId,
        getById: babyCareService.getMotorSkillLogById,
        create: babyCareService.createMotorSkillLog,
        update: babyCareService.updateMotorSkillLog,
        remove: babyCareService.deleteMotorSkillLog,
    });
    registerBabyLogRoutes({
        app,
        tag: "Baby Care",
        childPath: "nutrition",
        itemPath: "nutrition-logs",
        createSchema: validations_1.nutritionLogCreateSchema,
        updateSchema: validations_1.nutritionLogUpdateSchema,
        createMessage: "Nutrition log created successfully",
        updateMessage: "Nutrition log updated successfully",
        deleteMessage: "Nutrition log deleted successfully",
        fetchMessage: "Nutrition logs fetched successfully",
        getByBabyId: babyCareService.getNutritionLogsByBabyId,
        getById: babyCareService.getNutritionLogById,
        create: babyCareService.createNutritionLog,
        update: babyCareService.updateNutritionLog,
        remove: babyCareService.deleteNutritionLog,
    });
    registerBabyLogRoutes({
        app,
        tag: "Baby Care",
        childPath: "sleep",
        itemPath: "sleep-logs",
        createSchema: validations_1.sleepLogCreateSchema,
        updateSchema: validations_1.sleepLogUpdateSchema,
        createMessage: "Sleep log created successfully",
        updateMessage: "Sleep log updated successfully",
        deleteMessage: "Sleep log deleted successfully",
        fetchMessage: "Sleep logs fetched successfully",
        getByBabyId: babyCareService.getSleepLogsByBabyId,
        getById: babyCareService.getSleepLogById,
        create: babyCareService.createSleepLog,
        update: babyCareService.updateSleepLog,
        remove: babyCareService.deleteSleepLog,
    });
    registerBabyLogRoutes({
        app,
        tag: "Baby Care",
        childPath: "feeds",
        itemPath: "feed-logs",
        createSchema: validations_1.feedLogCreateSchema,
        updateSchema: validations_1.feedLogUpdateSchema,
        createMessage: "Feed log created successfully",
        updateMessage: "Feed log updated successfully",
        deleteMessage: "Feed log deleted successfully",
        fetchMessage: "Feed logs fetched successfully",
        getByBabyId: babyCareService.getFeedLogsByBabyId,
        getById: babyCareService.getFeedLogById,
        create: babyCareService.createFeedLog,
        update: babyCareService.updateFeedLog,
        remove: babyCareService.deleteFeedLog,
    });
}
function registerBabyLogRoutes(options) {
    const { app, tag, childPath, itemPath, createSchema, updateSchema, createMessage, updateMessage, deleteMessage, fetchMessage, getByBabyId, getById, create, update, remove, } = options;
    app.get(`/profiles/:babyId/${childPath}`, {
        schema: {
            tags: [tag],
            summary: `List ${childPath} by baby profile ID`,
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.babyLogBabyIdParamsSchema, { target: "openApi3" }),
            response: { 200: successArrayResponse },
        },
    }, async (req) => {
        const { babyId } = (0, validations_1.validateData)(validations_1.babyLogBabyIdParamsSchema, req.params);
        return {
            success: true,
            message: fetchMessage,
            data: await getByBabyId(babyId),
        };
    });
    app.get(`/${itemPath}/:id`, {
        schema: {
            tags: [tag],
            summary: `Get ${itemPath} by ID`,
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.babyLogIdParamsSchema, { target: "openApi3" }),
            response: { 200: successObjectResponse },
        },
    }, async (req) => {
        const { id } = (0, validations_1.validateData)(validations_1.babyLogIdParamsSchema, req.params);
        return {
            success: true,
            message: fetchMessage,
            data: await getById(id),
        };
    });
    app.post(`/profiles/:babyId/${childPath}`, {
        schema: {
            tags: [tag],
            summary: `Create ${itemPath}`,
            consumes: ["application/json", "application/x-www-form-urlencoded"],
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.babyLogBabyIdParamsSchema, { target: "openApi3" }),
            body: (0, validations_1.zodToSwagger)(createSchema),
            response: { 201: successObjectResponse },
        },
    }, async (req, reply) => {
        const { babyId } = (0, validations_1.validateData)(validations_1.babyLogBabyIdParamsSchema, req.params);
        const body = (0, validations_1.validateData)(createSchema, req.body);
        return reply.code(201).send({
            success: true,
            message: createMessage,
            data: await create({ ...body, babyId }),
        });
    });
    app.post(`/${itemPath}`, {
        schema: {
            tags: [tag],
            summary: `Create ${itemPath}`,
            consumes: ["application/json", "application/x-www-form-urlencoded"],
            body: (0, validations_1.zodToSwagger)(createSchema),
            response: { 201: successObjectResponse },
        },
    }, async (req, reply) => {
        const body = (0, validations_1.validateData)(createSchema, req.body);
        if (!body.babyId) {
            throw new validations_1.ValidationError([{ field: "babyId", message: "babyId is required" }]);
        }
        return reply.code(201).send({
            success: true,
            message: createMessage,
            data: await create(body),
        });
    });
    app.patch(`/${itemPath}/:id`, {
        schema: {
            tags: [tag],
            summary: `Update ${itemPath}`,
            consumes: ["application/json", "application/x-www-form-urlencoded"],
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.babyLogIdParamsSchema, { target: "openApi3" }),
            body: (0, validations_1.zodToSwagger)(updateSchema),
            response: { 200: successObjectResponse },
        },
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.babyLogIdParamsSchema, req.params);
        const body = (0, validations_1.validateData)(updateSchema, req.body);
        return reply.send({
            success: true,
            message: updateMessage,
            data: await update(id, body),
        });
    });
    app.delete(`/${itemPath}/:id`, {
        schema: {
            tags: [tag],
            summary: `Delete ${itemPath}`,
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.babyLogIdParamsSchema, { target: "openApi3" }),
            response: { 200: successDeleteResponse },
        },
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.babyLogIdParamsSchema, req.params);
        return reply.send({
            success: true,
            message: deleteMessage,
            data: await remove(id),
        });
    });
}
//# sourceMappingURL=babyCare.js.map