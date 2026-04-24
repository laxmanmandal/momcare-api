"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLessons = getLessons;
exports.getLessonsByCourseUuid = getLessonsByCourseUuid;
exports.getLesson = getLesson;
exports.addLesson = addLesson;
exports.updateLesson = updateLesson;
exports.getCourses = getCourses;
exports.getCourse = getCourse;
exports.getManyCourses = getManyCourses;
exports.createCourse = createCourse;
exports.updateCourse = updateCourse;
exports.getLessonMedias = getLessonMedias;
exports.getLessonMedia = getLessonMedia;
exports.createUpdateMany = createUpdateMany;
exports.updateLessonMedia = updateLessonMedia;
exports.changeCourseStatus = changeCourseStatus;
exports.changeLessonStatus = changeLessonStatus;
exports.LessonMediaStatus = LessonMediaStatus;
const client_1 = __importDefault(require("../prisma/client"));
// Lessons
async function getLessons(params) {
    const { query } = params;
    return client_1.default.lesson.findMany({
        where: {
            AND: [
                query ? { title: { contains: query } } : {},
            ],
        },
        include: { LessonMedia: true, mediaRef: true },
        take: 50,
        orderBy: { created_at: 'desc' }
    });
}
async function getLessonsByCourseUuid(courseUuid) {
    // 1️⃣ Get course with lessonIds
    const course = await client_1.default.course.findUnique({
        where: { uuid: courseUuid },
        select: {
            lessonIds: true,
        },
    });
    // 2️⃣ Handle course not found
    if (!course) {
        throw new Error(`Course with UUID '${courseUuid}' not found.`);
    }
    // 3️⃣ Safely extract lessonIds
    const lessonIds = Array.isArray(course.lessonIds)
        ? course.lessonIds
        : [];
    // 4️⃣ If no lessons linked, return empty array
    if (lessonIds.length === 0) {
        return [];
    }
    // 5️⃣ Fetch lessons
    const lessons = await client_1.default.lesson.findMany({
        where: {
            is_active: true,
            id: { in: lessonIds },
        },
        include: {
            mediaRef: true,
        },
        // optional: preserve order as in lessonIds
        orderBy: {
            id: 'asc',
        },
    });
    return lessons;
}
async function getLesson(uuid) {
    const lesson = await client_1.default.lesson.findUnique({
        where: { uuid },
        include: {
            LessonMedia: {
                where: {
                    is_active: true,
                },
                select: {
                    id: true,
                    lessonId: true,
                    title: true,
                    mediaResourceId: true,
                    is_active: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    mediaRef: true,
                },
                orderBy: {
                    id: 'asc',
                },
            }, mediaRef: {
                where: {
                    isActive: true,
                },
                select: {
                    title: true,
                    type: true,
                    mimeType: true,
                    thumbnail: true,
                    url: true,
                }
            }
        },
    });
    if (!lesson) {
        throw new Error("Lesson not found");
    }
    return lesson;
}
async function addLesson(data) {
    return client_1.default.lesson.create({ data });
}
async function updateLesson(uuid, data) {
    return client_1.default.lesson.update({ where: { uuid }, data });
}
async function getCourses() {
    const courses = await client_1.default.course.findMany({
        include: { mediaRef: true, subscriptions: true },
    });
    const coursesWithLessons = await Promise.all(courses.map(async (course) => {
        const lessonIds = course.lessonIds;
        // ✅ Explicitly type this as Lesson[]
        let lessons = [];
        if (lessonIds && lessonIds.length > 0) {
            lessons = await client_1.default.lesson.findMany({
                where: { id: { in: lessonIds } },
                include: { mediaRef: true }, // optional
            });
        }
        return {
            ...course,
            lessons,
        };
    }));
    return coursesWithLessons;
}
async function getCourse(uuid) {
    // 1️⃣ Get the course with related data
    const course = await client_1.default.course.findUnique({
        where: { uuid },
        include: {
            mediaRef: true,
            subscriptions: true,
        },
    });
    // 2️⃣ Handle case when course not found
    if (!course) {
        throw new Error(`Course with UUID '${uuid}' not found.`);
    }
    // 3️⃣ Safely extract and cast lessonIds
    const lessonIds = Array.isArray(course.lessonIds)
        ? course.lessonIds
        : [];
    // 4️⃣ Fetch lessons if IDs exist
    let lessons = [];
    if (lessonIds.length > 0) {
        lessons = await client_1.default.lesson.findMany({
            where: {
                id: { in: lessonIds },
            },
            include: { mediaRef: true },
        });
    }
    // 5️⃣ Return combined data
    return {
        ...course,
        lessons,
    };
}
async function getManyCourses(ids) {
    // 1️⃣ Get the courses with related data
    const courses = await client_1.default.course.findMany({
        where: { id: { in: ids } },
        include: {
            mediaRef: true,
        },
    });
    // 2️⃣ If no courses found, return empty array
    if (!courses || courses.length === 0) {
        return [];
    }
    // 3️⃣ For each course, fetch related lessons (if any) and return combined result
    const coursesWithLessons = await Promise.all(courses.map(async (course) => {
        const lessonIds = Array.isArray(course.lessonIds)
            ? course.lessonIds
            : [];
        let lessons = [];
        if (lessonIds.length > 0) {
            lessons = await client_1.default.lesson.findMany({
                where: { id: { in: lessonIds } },
                include: { mediaRef: true },
            });
        }
        return {
            ...course,
            lessons,
        };
    }));
    return coursesWithLessons;
}
async function createCourse(data) {
    return client_1.default.course.create({ data });
}
async function updateCourse(uuid, data) {
    return client_1.default.course.update({ where: { uuid }, data });
}
async function getLessonMedias(lessonuuid) {
    const lesson = await client_1.default.lesson.findUnique({ where: { uuid: lessonuuid } });
    if (!lesson)
        throw new Error('Failed to get lesson medias');
    return client_1.default.lessonMedia.findMany({
        where: { lessonId: lesson.id },
        include: { lesson: true, mediaRef: true },
    });
}
async function getLessonMedia(id) {
    return await client_1.default.lessonMedia.findUnique({
        where: { id }, include: { lesson: true, mediaRef: true },
    });
}
async function createUpdateMany(items) {
    return client_1.default.$transaction(items.map(item => client_1.default.lessonMedia.upsert({
        where: { id: item.id }, // or unique field (mediaId, uuid, etc.)
        update: item,
        create: item
    })));
}
async function updateLessonMedia(id, data) {
    return client_1.default.lessonMedia.update({ where: { id }, data });
}
async function changeCourseStatus(uuid) {
    const Course = await client_1.default.course.findUnique({ where: { uuid } });
    if (!Course)
        throw new Error("Course not found");
    return client_1.default.course.update({
        where: { uuid },
        data: { is_active: !Course.is_active },
    });
}
async function changeLessonStatus(uuid) {
    const lesson = await client_1.default.lesson.findUnique({ where: { uuid } });
    if (!lesson)
        throw new Error("Lesson not found");
    return client_1.default.lesson.update({
        where: { uuid },
        data: { is_active: !lesson.is_active },
    });
}
async function LessonMediaStatus(id) {
    const lesson = await client_1.default.lessonMedia.findUnique({ where: { id } });
    if (!lesson)
        throw new Error("Lesson Media not found");
    return client_1.default.lessonMedia.update({
        where: { id },
        data: { is_active: !lesson.is_active },
    });
}
//# sourceMappingURL=courseService.js.map