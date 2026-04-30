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
exports.default = courseRoutes;
const courseService = __importStar(require("../services/courseService"));
const auth_1 = require("../middleware/auth");
const zodOpenApi_1 = require("../utils/zodOpenApi");
const validations_1 = require("../validations");
const successArrayResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object', additionalProperties: true } }
    }
};
const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object', additionalProperties: true }
    }
};
const errorResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
    }
};
async function courseRoutes(app) {
    app.addHook('preHandler', auth_1.authMiddleware);
    // -----------------------------
    // LESSON ROUTES
    // -----------------------------
    app.get('/lessons', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'List all lessons',
            description: 'Retrieve a paginated/filtered list of lessons.',
            response: { 200: successArrayResponse },
            querystring: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseLessonQuerySchema, { target: 'openApi3' })
        }
    }, async (req, reply) => {
        const query = (0, validations_1.validateData)(validations_1.courseLessonQuerySchema, req.query ?? {});
        const lessons = await courseService.getLessons(query);
        return { success: true, message: 'Lessons fetched successfully', data: lessons };
    });
    app.get('/lesson/:uuid', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'Get lesson by UUID',
            response: { 200: successObjectResponse },
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseUuidParamsSchema, { target: 'openApi3' })
        }
    }, async (req, reply) => {
        const { uuid } = (0, validations_1.validateData)(validations_1.courseUuidParamsSchema, req.params);
        const lesson = await courseService.getLesson(uuid);
        return { success: true, message: 'Lesson fetched successfully', data: lesson };
    });
    app.post('/lessons', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'Create a lesson',
            consumes: ['multipart/form-data', 'application/json', 'application/x-www-form-urlencoded'],
            response: { 201: successObjectResponse },
            body: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseLessonBodySchema, { target: 'openApi3' })
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        let uuid = await app.uid('LS', 'lesson');
        const { fields } = req.isMultipart() ? await app.parseMultipartMemory(req) : { fields: req.body ?? {} };
        const body = (0, validations_1.validateData)(validations_1.courseLessonBodySchema, fields);
        let data = { ...body, uuid };
        const newLesson = await courseService.addLesson(data);
        return reply.code(201).send({ success: true, message: 'Lesson created successfully', data: newLesson });
    });
    app.patch('/lesson/:uuid', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'Update a lesson',
            consumes: ['multipart/form-data', 'application/json', 'application/x-www-form-urlencoded'],
            response: { 200: successObjectResponse },
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseUuidParamsSchema, { target: 'openApi3' }),
            body: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseLessonBodySchema, { target: 'openApi3' })
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { uuid } = (0, validations_1.validateData)(validations_1.courseUuidParamsSchema, req.params);
        const { fields } = req.isMultipart() ? await app.parseMultipartMemory(req) : { fields: req.body ?? {} };
        const updatedLesson = await courseService.updateLesson(uuid, (0, validations_1.validateData)(validations_1.courseLessonBodySchema, fields));
        return reply.send({ success: true, message: 'Lesson updated successfully', data: updatedLesson });
    });
    app.patch('/lesson/:uuid/status', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'Toggle lesson status',
            response: { 200: successObjectResponse },
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseUuidParamsSchema, { target: 'openApi3' })
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { uuid } = (0, validations_1.validateData)(validations_1.courseUuidParamsSchema, req.params);
        const updatedLesson = await courseService.changeLessonStatus(uuid);
        const msg = updatedLesson.is_active ? "Lesson Activated successfully" : "Lesson Disabled Successfully";
        return reply.send({ success: true, message: msg, data: updatedLesson });
    });
    // -----------------------------
    // LESSON MEDIA ROUTES
    // -----------------------------
    app.get('/lessons/:lessonUuid/medias', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'Get lesson medias by lesson UUID',
            response: { 200: successArrayResponse },
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseLessonUuidParamsSchema, { target: 'openApi3' })
        }
    }, async (req, reply) => {
        const { lessonUuid } = (0, validations_1.validateData)(validations_1.courseLessonUuidParamsSchema, req.params);
        const medias = await courseService.getLessonMedias(lessonUuid);
        return { success: true, message: 'Lesson medias fetched successfully', data: medias };
    });
    app.get('/lesson-media/:id', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'Get lesson media by ID',
            response: { 200: successObjectResponse },
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseIdParamsSchema, { target: 'openApi3' })
        }
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.courseIdParamsSchema, req.params);
        const media = await courseService.getLessonMedia(id);
        return { success: true, message: 'Lesson media fetched successfully', data: media };
    });
    app.post('/lesson-medias', {
        schema: {
            tags: ['Lesson-media'],
            summary: 'Create or update lesson medias',
            consumes: ['multipart/form-data', 'application/json', 'application/x-www-form-urlencoded'],
            response: { 201: successObjectResponse },
            body: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseLessonMediaBodySchema, { target: 'openApi3' })
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { fields } = req.isMultipart() ? await app.parseMultipartMemory(req) : { fields: req.body ?? {} };
        const item = (0, validations_1.validateData)(validations_1.courseLessonMediaBodySchema, fields);
        const result = await courseService.createUpdateMany([item]);
        reply.code(201).send({ success: true, message: 'Lesson medias saved', data: result });
    });
    app.patch('/lesson-medias/:id/status', {
        schema: {
            tags: ['Lesson-media'],
            summary: 'Toggle lesson media status',
            response: { 200: successObjectResponse },
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseIdParamsSchema, { target: 'openApi3' })
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { id } = (0, validations_1.validateData)(validations_1.courseIdParamsSchema, req.params);
        const updatedMedia = await courseService.LessonMediaStatus(id);
        const msg = updatedMedia.is_active ? "Lesson Media Activated successfully" : "Lesson Media Disabled Successfully";
        return reply.send({ success: true, message: msg, data: updatedMedia });
    });
    // -----------------------------
    // COURSE ROUTES
    // -----------------------------
    app.get('/', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'List all courses',
            response: { 200: successArrayResponse }
        }
    }, async (_, reply) => {
        const courses = await courseService.getCourses();
        return reply.code(200).send({ success: true, message: 'Courses fetched successfully', data: courses });
    });
    app.get('/:uuid', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'Get course by UUID',
            response: { 200: successObjectResponse, 404: errorResponse },
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseUuidParamsSchema, { target: 'openApi3' })
        }
    }, async (req, reply) => {
        const { uuid } = (0, validations_1.validateData)(validations_1.courseUuidParamsSchema, req.params);
        const course = await courseService.getCourse(uuid);
        if (!course)
            return reply.code(404).send({ success: false, message: 'Course not found' });
        return reply.send({ success: true, message: 'Course fetched successfully', data: course });
    });
    app.get('/many/:ids', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'Get many courses by IDs',
            response: { 200: successArrayResponse },
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseIdsParamsSchema, { target: 'openApi3' })
        }
    }, async (req, reply) => {
        const { ids } = (0, validations_1.validateData)(validations_1.courseIdsParamsSchema, req.params);
        const idArray = ids.split(',').map(Number);
        const courses = await courseService.getManyCourses(idArray);
        return reply.code(200).send({ success: true, message: 'Courses fetched successfully', data: courses });
    });
    app.post('/', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'Create a course',
            consumes: ['multipart/form-data', 'application/json', 'application/x-www-form-urlencoded'],
            response: { 201: successObjectResponse },
            body: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseCreateBodySchema, { target: 'openApi3' })
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        let uuid = await app.uid('CRS', 'course');
        const { fields } = req.isMultipart() ? await app.parseMultipartMemory(req) : { fields: req.body ?? {} };
        const body = (0, validations_1.validateData)(validations_1.courseCreateBodySchema, fields);
        let data = { ...body, uuid };
        const newCourse = await courseService.createCourse(data);
        return reply.code(201).send({ success: true, message: 'Course created successfully', data: newCourse });
    });
    app.patch('/:uuid', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'Update a course',
            consumes: ['multipart/form-data', 'application/json', 'application/x-www-form-urlencoded'],
            response: { 200: successObjectResponse },
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseUuidParamsSchema, { target: 'openApi3' }),
            body: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseUpdateBodySchema, { target: 'openApi3' })
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { uuid } = (0, validations_1.validateData)(validations_1.courseUuidParamsSchema, req.params);
        const { fields } = req.isMultipart() ? await app.parseMultipartMemory(req) : { fields: req.body ?? {} };
        const updatedCourse = await courseService.updateCourse(uuid, (0, validations_1.validateData)(validations_1.courseUpdateBodySchema, fields));
        return reply.send({ success: true, message: 'Course updated successfully', data: updatedCourse });
    });
    app.patch('/:uuid/status', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'Toggle course status',
            response: { 200: successObjectResponse },
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseUuidParamsSchema, { target: 'openApi3' })
        },
        preHandler: [auth_1.onlyOrg]
    }, async (req, reply) => {
        const { uuid } = (0, validations_1.validateData)(validations_1.courseUuidParamsSchema, req.params);
        const updatedCourse = await courseService.changeCourseStatus(uuid);
        return reply.send({ success: true, message: 'Course status updated successfully', data: updatedCourse });
    });
    app.get('/:uuid/lessons', {
        schema: {
            tags: ['Lessons-courses'],
            summary: 'Get lessons for a course',
            response: { 200: successArrayResponse },
            params: (0, zodOpenApi_1.zodToJsonSchema)(validations_1.courseUuidParamsSchema, { target: 'openApi3' })
        }
    }, async (req, reply) => {
        const { uuid: courseUuid } = (0, validations_1.validateData)(validations_1.courseUuidParamsSchema, req.params);
        const lessons = await courseService.getLessonsByCourseUuid(courseUuid);
        return { success: true, message: 'Lessons fetched successfully', data: lessons };
    });
}
//# sourceMappingURL=courses.js.map