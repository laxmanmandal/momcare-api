import { FastifyInstance } from 'fastify'
import * as courseService from '../services/courseService'
import { authMiddleware, onlyOrg } from '../middleware/auth'

export default async function courseRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  // -----------------------------
  // LESSON ROUTES
  // -----------------------------

  // Get all lessons
  app.get<{ Querystring: any }>('/lessons', { schema: { tags: ['Lessons-courses'] } }, async (req, reply) => {
    const lessons = await courseService.getLessons(req.query);
    return { success: true, message: 'Lessons fetched successfully', data: lessons };

  });

  // Get single lesson by UUID
  app.get('/lesson/:uuid', { schema: { tags: ['Lessons-courses'] } }, async (req, reply) => {
    const { uuid } = req.params as { uuid: string };

    const lesson = await courseService.getLesson(uuid);
    return { success: true, message: 'Lesson fetched successfully', data: lesson };

  });



  // Add Lesson
  app.post('/lessons', { schema: { tags: ['Lessons-courses'] }, preHandler: [onlyOrg] }, async (req, reply) => {

    let uuid = await app.uid('LS', 'lesson');
    let data = { ...(req.body as any), uuid };
    console.log('log data', data);

    const newLesson = await courseService.addLesson(data);
    return reply.code(201).send({ success: true, message: 'Lesson created successfully', data: newLesson });

  });

  // Update Lesson
  app.patch('/lesson/:uuid', { schema: { tags: ['Lessons-courses'] }, preHandler: [onlyOrg] }, async (req, reply) => {

    const { uuid } = req.params as { uuid: string };
    const updatedLesson = await courseService.updateLesson(uuid, req.body as any);
    return reply.send({ success: true, message: 'Lesson updated successfully', data: updatedLesson });

  });

  // Change lesson status
  app.patch('/lesson/:uuid/status',
    { schema: { tags: ['Lessons-courses'] }, preHandler: [onlyOrg] },
    async (req, reply) => {

      const { uuid } = req.params as { uuid: string };
      const updatedLesson = await courseService.changeLessonStatus(uuid);
      const msg = updatedLesson.is_active ? "Lesson Activated successfully" : "Lesson Disabled Successfully";
      return reply.send({ success: true, message: msg, data: updatedLesson });

    });

  // -----------------------------
  // LESSON MEDIA ROUTES
  // -----------------------------

  // Get all lesson medias by lesson UUID
  app.get('/lessons/:lessonUuid/medias', { schema: { tags: ['Lessons-courses'] } }, async (req, reply) => {
    const { lessonUuid } = req.params as { lessonUuid: string };

    const medias = await courseService.getLessonMedias(lessonUuid);
    return { success: true, message: 'Lesson medias fetched successfully', data: medias };

  });

  // Get single lesson media by ID
  app.get('/lesson-media/:id', { schema: { tags: ['Lessons-courses'] } }, async (req, reply) => {
    const { id } = req.params as { id: number };

    const media = await courseService.getLessonMedia(id);
    return { success: true, message: 'Lesson media fetched successfully', data: media };

  });

  // Create Lesson media
  app.post('/lesson-medias', { schema: { tags: ['Lesson-media'] }, preHandler: [onlyOrg] }, async (req: any, reply) => {


    const result = await courseService.createUpdateMany(req.body);
    reply.code(201).send({
      success: true,
      message: 'Lesson medias saved',
      data: result
    });

  });




  // Change Lesson Media status
  app.patch('/lesson-medias/:id/status', { schema: { tags: ['Lesson-media'] }, preHandler: [onlyOrg] }, async (req, reply) => {

    const { id } = req.params as { id: number };
    const updatedMedia = await courseService.LessonMediaStatus(id);
    const msg = updatedMedia.is_active ? "Lesson Media Activated successfully" : "Lesson Media Disabled Successfully";
    return reply.send({ success: true, message: msg, data: updatedMedia });

  });

  // -----------------------------
  // COURSE ROUTES
  // -----------------------------

  // List all courses
  app.get('/', { schema: { tags: ['Lessons-courses'] } }, async (_, reply) => {

    const courses = await courseService.getCourses();
    return reply.code(200).send({ success: true, message: 'Courses fetched successfully', data: courses });

  });

  // Get course by UUID
  app.get('/:uuid', { schema: { tags: ['Lessons-courses'] } }, async (req, reply) => {

    const { uuid } = req.params as { uuid: string };
    const course = await courseService.getCourse(uuid);
    if (!course)
      return reply.code(404).send({ success: false, message: 'Course not found' });
    return reply.send({ success: true, message: 'Course fetched successfully', data: course });

  });
  //get many courses by ids
  app.get('/many/:ids', { schema: { tags: ['Lessons-courses'] } }, async (req, reply) => {

    const { ids } = req.params as { ids: string }; // '2,8,9'
    const idArray = ids.split(',').map(Number);   // [2, 8, 9]

    // Call your existing function
    const courses = await courseService.getManyCourses(idArray);

    return reply.code(200).send({
      success: true,
      message: 'Courses fetched successfully',
      data: courses,
    });

  });


  // Create course
  app.post('/', { schema: { tags: ['Lessons-courses'] }, preHandler: [onlyOrg] }, async (req, reply) => {

    // Ensure UID returns string
    let uuid: string = await app.uid('CRS', 'course');
    let data = { ...(req.body as any), uuid };

    // Create course
    const newCourse = await courseService.createCourse(data);

    // Send proper 201 response
    return reply.code(201).send({
      success: true,
      message: 'Course created successfully',
      data: newCourse
    });

  });


  // Update course
  app.patch('/:uuid', { schema: { tags: ['Lessons-courses'] }, preHandler: [onlyOrg] }, async (req, reply) => {

    const { uuid } = req.params as { uuid: string };
    const updatedCourse = await courseService.updateCourse(uuid, req.body as any);
    return reply.send({ success: true, message: 'Course updated successfully', data: updatedCourse });

  });

  // Change course status
  app.patch('/:uuid/status', { schema: { tags: ['Lessons-courses'] }, preHandler: [onlyOrg] }, async (req, reply) => {
    const { uuid } = req.params as { uuid: string };
    const updatedCourse = await courseService.changeCourseStatus(uuid);
    return reply.send({ success: true, message: 'Course status updated successfully', data: updatedCourse });

  });

  // Get lessons for a specific course
  app.get('/:courseUuid/lessons', { schema: { tags: ['Lessons-courses'] } }, async (req, reply) => {
    const { courseUuid } = req.params as { courseUuid: string };

    const lessons = await courseService.getLessonsByCourseUuid(courseUuid);
    return { success: true, message: 'Lessons fetched successfully', data: lessons };

  });

}
