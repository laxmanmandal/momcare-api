import { FastifyInstance } from "fastify";
import * as babyCareService from "../services/babyCareService";
import { authMiddleware } from "../middleware/auth";
import { zodToJsonSchema } from "../utils/zodOpenApi";
import {
  babyIdParamsSchema,
  babyLogBabyIdParamsSchema,
  babyLogIdParamsSchema,
  babyProfileCreateSchema,
  babyProfileUpdateSchema,
  babyProfileUserIdParamsSchema,
  feedLogCreateSchema,
  feedLogUpdateSchema,
  motorSkillLogCreateSchema,
  motorSkillLogUpdateSchema,
  nutritionLogCreateSchema,
  nutritionLogUpdateSchema,
  sleepLogCreateSchema,
  sleepLogUpdateSchema,
  vaccinationLogCreateSchema,
  vaccinationLogUpdateSchema,
  ValidationError,
  validateData,
  zodToSwagger,
} from "../validations";

const successObjectResponse = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    message: { type: "string" },
    data: { type: "object", additionalProperties: true },
  },
} as const;

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
} as const;

const successDeleteResponse = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    message: { type: "string" },
    data: { type: "object", additionalProperties: true },
  },
} as const;

export default async function babyCareRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.get(
    "/profiles",
    {
      schema: {
        tags: ["Baby Care"],
        summary: "List all baby profiles",
        response: { 200: successArrayResponse },
      },
    },
    async () => ({
      success: true,
      message: "Baby profiles fetched successfully",
      data: await babyCareService.getBabyProfiles(),
    }),
  );

  app.get(
    "/profiles/user/:userId",
    {
      schema: {
        tags: ["Baby Care"],
        summary: "List baby profiles by user ID",
        params: zodToJsonSchema(babyProfileUserIdParamsSchema as any, { target: "openApi3" }),
        response: { 200: successArrayResponse },
      },
    },
    async (req) => {
      const { userId } = validateData(babyProfileUserIdParamsSchema, req.params);

      return {
        success: true,
        message: "Baby profiles fetched successfully",
        data: await babyCareService.getBabyProfilesByUserId(userId),
      };
    },
  );

  app.get(
    "/profiles/:id",
    {
      schema: {
        tags: ["Baby Care"],
        summary: "Get baby profile by ID",
        params: zodToJsonSchema(babyIdParamsSchema as any, { target: "openApi3" }),
        response: { 200: successObjectResponse },
      },
    },
    async (req) => {
      const { id } = validateData(babyIdParamsSchema, req.params);

      return {
        success: true,
        message: "Baby profile fetched successfully",
        data: await babyCareService.getBabyProfileById(id),
      };
    },
  );

  app.post(
    "/profiles",
    {
      schema: {
        tags: ["Baby Care"],
        summary: "Create baby profile",
        consumes: ["application/json", "application/x-www-form-urlencoded"],
        body: zodToSwagger(babyProfileCreateSchema),
        response: { 201: successObjectResponse },
      },
    },
    async (req: any, reply) => {
      const body = validateData(babyProfileCreateSchema, req.body);
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
    },
  );

  app.patch(
    "/profiles/:id",
    {
      schema: {
        tags: ["Baby Care"],
        summary: "Update baby profile",
        consumes: ["application/json", "application/x-www-form-urlencoded"],
        params: zodToJsonSchema(babyIdParamsSchema as any, { target: "openApi3" }),
        body: zodToSwagger(babyProfileUpdateSchema),
        response: { 200: successObjectResponse },
      },
    },
    async (req, reply) => {
      const { id } = validateData(babyIdParamsSchema, req.params);
      const body = validateData(babyProfileUpdateSchema, req.body);

      return reply.send({
        success: true,
        message: "Baby profile updated successfully",
        data: await babyCareService.updateBabyProfile(id, body),
      });
    },
  );

  app.delete(
    "/profiles/:id",
    {
      schema: {
        tags: ["Baby Care"],
        summary: "Delete baby profile",
        params: zodToJsonSchema(babyIdParamsSchema as any, { target: "openApi3" }),
        response: { 200: successDeleteResponse },
      },
    },
    async (req, reply) => {
      const { id } = validateData(babyIdParamsSchema, req.params);

      return reply.send({
        success: true,
        message: "Baby profile deleted successfully",
        data: await babyCareService.deleteBabyProfile(id),
      });
    },
  );

  registerBabyLogRoutes({
    app,
    tag: "Baby Care",
    childPath: "vaccinations",
    itemPath: "vaccination-logs",
    createSchema: vaccinationLogCreateSchema,
    updateSchema: vaccinationLogUpdateSchema,
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
    createSchema: motorSkillLogCreateSchema,
    updateSchema: motorSkillLogUpdateSchema,
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
    createSchema: nutritionLogCreateSchema,
    updateSchema: nutritionLogUpdateSchema,
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
    createSchema: sleepLogCreateSchema,
    updateSchema: sleepLogUpdateSchema,
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
    createSchema: feedLogCreateSchema,
    updateSchema: feedLogUpdateSchema,
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

function registerBabyLogRoutes(options: {
  app: FastifyInstance;
  tag: string;
  childPath: string;
  itemPath: string;
  createSchema: any;
  updateSchema: any;
  createMessage: string;
  updateMessage: string;
  deleteMessage: string;
  fetchMessage: string;
  getByBabyId: (babyId: bigint) => Promise<unknown>;
  getById: (id: bigint) => Promise<unknown>;
  create: (data: any) => Promise<unknown>;
  update: (id: bigint, data: any) => Promise<unknown>;
  remove: (id: bigint) => Promise<unknown>;
}) {
  const {
    app,
    tag,
    childPath,
    itemPath,
    createSchema,
    updateSchema,
    createMessage,
    updateMessage,
    deleteMessage,
    fetchMessage,
    getByBabyId,
    getById,
    create,
    update,
    remove,
  } = options;

  app.get(
    `/profiles/:babyId/${childPath}`,
    {
      schema: {
        tags: [tag],
        summary: `List ${childPath} by baby profile ID`,
        params: zodToJsonSchema(babyLogBabyIdParamsSchema as any, { target: "openApi3" }),
        response: { 200: successArrayResponse },
      },
    },
    async (req) => {
      const { babyId } = validateData(babyLogBabyIdParamsSchema, req.params);

      return {
        success: true,
        message: fetchMessage,
        data: await getByBabyId(babyId),
      };
    },
  );

  app.get(
    `/${itemPath}/:id`,
    {
      schema: {
        tags: [tag],
        summary: `Get ${itemPath} by ID`,
        params: zodToJsonSchema(babyLogIdParamsSchema as any, { target: "openApi3" }),
        response: { 200: successObjectResponse },
      },
    },
    async (req) => {
      const { id } = validateData(babyLogIdParamsSchema, req.params);

      return {
        success: true,
        message: fetchMessage,
        data: await getById(id),
      };
    },
  );

  app.post(
    `/profiles/:babyId/${childPath}`,
    {
      schema: {
        tags: [tag],
        summary: `Create ${itemPath}`,
        consumes: ["application/json", "application/x-www-form-urlencoded"],
        params: zodToJsonSchema(babyLogBabyIdParamsSchema as any, { target: "openApi3" }),
        body: zodToSwagger(createSchema),
        response: { 201: successObjectResponse },
      },
    },
    async (req, reply) => {
      const { babyId } = validateData(babyLogBabyIdParamsSchema, req.params);
      const body = validateData(createSchema, req.body);

      return reply.code(201).send({
        success: true,
        message: createMessage,
        data: await create({ ...body, babyId }),
      });
    },
  );

  app.post(
    `/${itemPath}`,
    {
      schema: {
        tags: [tag],
        summary: `Create ${itemPath}`,
        consumes: ["application/json", "application/x-www-form-urlencoded"],
        body: zodToSwagger(createSchema),
        response: { 201: successObjectResponse },
      },
    },
    async (req, reply) => {
      const body = validateData(createSchema, req.body);
      if (!body.babyId) {
        throw new ValidationError([{ field: "babyId", message: "babyId is required" }]);
      }

      return reply.code(201).send({
        success: true,
        message: createMessage,
        data: await create(body),
      });
    },
  );

  app.patch(
    `/${itemPath}/:id`,
    {
      schema: {
        tags: [tag],
        summary: `Update ${itemPath}`,
        consumes: ["application/json", "application/x-www-form-urlencoded"],
        params: zodToJsonSchema(babyLogIdParamsSchema as any, { target: "openApi3" }),
        body: zodToSwagger(updateSchema),
        response: { 200: successObjectResponse },
      },
    },
    async (req, reply) => {
      const { id } = validateData(babyLogIdParamsSchema, req.params);
      const body = validateData(updateSchema, req.body);

      return reply.send({
        success: true,
        message: updateMessage,
        data: await update(id, body),
      });
    },
  );

  app.delete(
    `/${itemPath}/:id`,
    {
      schema: {
        tags: [tag],
        summary: `Delete ${itemPath}`,
        params: zodToJsonSchema(babyLogIdParamsSchema as any, { target: "openApi3" }),
        response: { 200: successDeleteResponse },
      },
    },
    async (req, reply) => {
      const { id } = validateData(babyLogIdParamsSchema, req.params);

      return reply.send({
        success: true,
        message: deleteMessage,
        data: await remove(id),
      });
    },
  );
}
