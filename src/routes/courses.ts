import { FastifyInstance } from 'fastify'
import * as courseService from '../services/courseService'
import { authMiddleware, onlyOrg } from '../middleware/auth'
import { zodToJsonSchema } from 'zod-to-json-schema'
import {
  courseCreateBodySchema,
  courseIdsParamsSchema,
  courseIdParamsSchema,
  courseLessonBodySchema,
  courseLessonMediaBodySchema,
  courseLessonQuerySchema,
  courseLessonUuidParamsSchema,
  courseUpdateBodySchema,
  courseUuidParamsSchema,
  validateData
} from '../validations';

const successArrayResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: { type: 'array', items: { type: 'object', additionalProperties: true } }
  }
} as const

const successObjectResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: { type: 'object', additionalProperties: true }
  }
} as const

const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' }
  }
} as const

export default async function courseRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  // -----------------------------
  // LESSON ROUTES
  // -----------------------------

  app.get<{ Querystring: any }>('/lessons', {
    schema: {
      tags: ['Lessons-courses'],
      summary: 'List all lessons',
      description: 'Retrieve a paginated/filtered list of lessons.',
      response: { 200: successArrayResponse }
    }
  }, async (req, reply) => {
    const query = validateData(courseLessonQuerySchema, req.query ?? {});
    const lessons = await courseService.getLessons(query);
    return { success: true, message: 'Lessons fetched successfully', data: lessons };
  });

  app.get('/lesson/:uuid', {
    schema: {
      tags: ['Lessons-courses'],
      summary: 'Get lesson by UUID',
      response: { 200: successObjectResponse }
    }
  }, async (req, reply) => {
    const { uuid } = validateData(courseUuidParamsSchema, req.params);
    const lesson = await courseService.getLesson(uuid);
    return { success: true, message: 'Lesson fetched successfully', data: lesson };
  });

  app.post('/lessons', {
    schema: {
      tags: ['Lessons-courses'],
      summary: 'Create a lesson',
      response: { 201: successObjectResponse },
      body: zodToJsonSchema(courseLessonBodySchema as any, { target: 'openApi3' })
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    let uuid = await app.uid('LS', 'lesson');
    const body = validateData(courseLessonBodySchema, req.body ?? {});
    let data = { ...body, uuid };
    const newLesson = await courseService.addLesson(data);
    return reply.code(201).send({ success: true, message: 'Lesson created successfully', data: newLesson });
  });

  app.patch('/lesson/:uuid', {
    schema: {
      tags: ['Lessons-courses'],
      summary: 'Update a lesson',
      response: { 200: successObjectResponse },
      body: zodToJsonSchema(courseLessonBodySchema as any, { target: 'openApi3' })
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    const { uuid } = validateData(courseUuidParamsSchema, req.params);
    const updatedLesson = await courseService.updateLesson(uuid, validateData(courseLessonBodySchema, req.body ?? {}));
    return reply.send({ success: true, message: 'Lesson updated successfully', data: updatedLesson });
  });

  app.patch('/lesson/:uuid/status', {
    schema: {
      tags: ['Lessons-courses'],
      summary: 'Toggle lesson status',
      response: { 200: successObjectResponse }
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    const { uuid } = validateData(courseUuidParamsSchema, req.params);
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
      response: { 200: successArrayResponse }
    }
  }, async (req, reply) => {
    const { lessonUuid } = validateData(courseLessonUuidParamsSchema, req.params);
    const medias = await courseService.getLessonMedias(lessonUuid);
    return { success: true, message: 'Lesson medias fetched successfully', data: medias };
  });

  app.get('/lesson-media/:id', {
    schema: {
      tags: ['Lessons-courses'],
      summary: 'Get lesson media by ID',
      response: { 200: successObjectResponse }
    }
  }, async (req, reply) => {
    const { id } = validateData(courseIdParamsSchema, req.params);
    const media = await courseService.getLessonMedia(id);
    return { success: true, message: 'Lesson media fetched successfully', data: media };
  });

  app.post('/lesson-medias', {
    schema: {
      tags: ['Lesson-media'],
      summary: 'Create or update lesson medias',
      response: { 201: successObjectResponse },
      body: zodToJsonSchema(courseLessonMediaBodySchema as any, { target: 'openApi3' })
    },
    preHandler: [onlyOrg]
  }, async (req: any, reply) => {
    const item = validateData(courseLessonMediaBodySchema, req.body ?? {});
    const result = await courseService.createUpdateMany([item]);
    reply.code(201).send({ success: true, message: 'Lesson medias saved', data: result });
  });

  app.patch('/lesson-medias/:id/status', {
    schema: {
      tags: ['Lesson-media'],
      summary: 'Toggle lesson media status',
      response: { 200: successObjectResponse }
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    const { id } = validateData(courseIdParamsSchema, req.params);
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
      response: { 200: successObjectResponse, 404: errorResponse }
    }
  }, async (req, reply) => {
    const { uuid } = validateData(courseUuidParamsSchema, req.params);
    const course = await courseService.getCourse(uuid);
    if (!course)
      return reply.code(404).send({ success: false, message: 'Course not found' });
    return reply.send({ success: true, message: 'Course fetched successfully', data: course });
  });

  app.get('/many/:ids', {
    schema: {
      tags: ['Lessons-courses'],
      summary: 'Get many courses by IDs',
      response: { 200: successArrayResponse }
    }
  }, async (req, reply) => {
    const { ids } = validateData(courseIdsParamsSchema, req.params);
    const idArray = ids.split(',').map(Number);
    const courses = await courseService.getManyCourses(idArray);
    return reply.code(200).send({ success: true, message: 'Courses fetched successfully', data: courses });
  });

  app.post('/', {
    schema: {
      tags: ['Lessons-courses'],
      summary: 'Create a course',
      response: { 201: successObjectResponse },
      body: zodToJsonSchema(courseCreateBodySchema as any, { target: 'openApi3' })
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    let uuid: string = await app.uid('CRS', 'course');
    const body = validateData(courseCreateBodySchema, req.body ?? {});
    let data = { ...body, uuid };
    const newCourse = await courseService.createCourse(data);
    return reply.code(201).send({ success: true, message: 'Course created successfully', data: newCourse });
  });

  app.patch('/:uuid', {
    schema: {
      tags: ['Lessons-courses'],
      summary: 'Update a course',
      response: { 200: successObjectResponse },
      body: zodToJsonSchema(courseUpdateBodySchema as any, { target: 'openApi3' })
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    const { uuid } = validateData(courseUuidParamsSchema, req.params);
    const updatedCourse = await courseService.updateCourse(uuid, validateData(courseUpdateBodySchema, req.body ?? {}));
    return reply.send({ success: true, message: 'Course updated successfully', data: updatedCourse });
  });

  app.patch('/:uuid/status', {
    schema: {
      tags: ['Lessons-courses'],
      summary: 'Toggle course status',
      response: { 200: successObjectResponse }
    },
    preHandler: [onlyOrg]
  }, async (req, reply) => {
    const { uuid } = validateData(courseUuidParamsSchema, req.params);
    const updatedCourse = await courseService.changeCourseStatus(uuid);
    return reply.send({ success: true, message: 'Course status updated successfully', data: updatedCourse });
  });

  app.get('/:courseUuid/lessons', {
    schema: {
      tags: ['Lessons-courses'],
      summary: 'Get lessons for a course',
      response: { 200: successArrayResponse }
    }
  }, async (req, reply) => {
    const { uuid: courseUuid } = validateData(courseUuidParamsSchema, req.params);
    const lessons = await courseService.getLessonsByCourseUuid(courseUuid);
    return { success: true, message: 'Lessons fetched successfully', data: lessons };
  });
}
