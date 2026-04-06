import prisma from '../prisma/client'
import { Lesson } from '@prisma/client'; // 👈 make sure your Prisma types are imported

// Lessons
export async function getLessons(params: any) {
  const { query } = params;
  return prisma.lesson.findMany({
    where: {
      AND: [
        query ? { title: { contains: query } } : {},
      ],
    },
    include: { LessonMedia: true, mediaRef: true },
    take: 50,
    orderBy: { created_at: 'desc' }
  })
}
export async function getLessonsByCourseUuid(courseUuid: string) {
  // 1️⃣ Get course with lessonIds
  const course = await prisma.course.findUnique({
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
    ? (course.lessonIds as number[])
    : [];

  // 4️⃣ If no lessons linked, return empty array
  if (lessonIds.length === 0) {
    return [];
  }

  // 5️⃣ Fetch lessons
  const lessons = await prisma.lesson.findMany({
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

export async function getLesson(uuid: string) {
  const lesson = await prisma.lesson.findUnique({
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
export async function addLesson(data: any) {
  return prisma.lesson.create({ data });
}

export async function updateLesson(uuid: string, data: any) {
  return prisma.lesson.update({ where: { uuid }, data })
}



export async function getCourses() {
  const courses = await prisma.course.findMany({
    include: { mediaRef: true, subscriptions: true },
  });

  const coursesWithLessons = await Promise.all(
    courses.map(async (course) => {
      const lessonIds = course.lessonIds as number[] | null;

      // ✅ Explicitly type this as Lesson[]
      let lessons: Lesson[] = [];

      if (lessonIds && lessonIds.length > 0) {
        lessons = await prisma.lesson.findMany({
          where: { id: { in: lessonIds } },
          include: { mediaRef: true }, // optional
        });
      }

      return {
        ...course,
        lessons,
      };
    })
  );

  return coursesWithLessons;
}



export async function getCourse(uuid: string) {
  // 1️⃣ Get the course with related data
  const course = await prisma.course.findUnique({
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
    ? (course.lessonIds as number[])
    : [];

  // 4️⃣ Fetch lessons if IDs exist
  let lessons: any = [];
  if (lessonIds.length > 0) {
    lessons = await prisma.lesson.findMany({
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

export async function getManyCourses(ids: number[]) {
  // 1️⃣ Get the courses with related data

  const courses = await prisma.course.findMany({
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
  const coursesWithLessons = await Promise.all(
    courses.map(async (course) => {
      const lessonIds = Array.isArray(course.lessonIds)

        ? (course.lessonIds as number[])
        : [];

      let lessons: any[] = [];
      if (lessonIds.length > 0) {
        lessons = await prisma.lesson.findMany({
          where: { id: { in: lessonIds } },
          include: { mediaRef: true },
        });
      }

      return {
        ...course,
        lessons,
      };
    })
  );

  return coursesWithLessons;
}

export async function createCourse(data: any) {
  return prisma.course.create({ data })
}

export async function updateCourse(uuid: string, data: any) {
  return prisma.course.update({ where: { uuid }, data })
}
export async function getLessonMedias(lessonuuid: string) {
  const lesson = await prisma.lesson.findUnique({ where: { uuid: lessonuuid } })
  if (!lesson) throw new Error('Failed to get lesson medias')
  return prisma.lessonMedia.findMany({
    where: { lessonId: lesson.id },
    include: { lesson: true, mediaRef: true },

  })
}
export async function getLessonMedia(id: number) {
  return await prisma.lessonMedia.findUnique({
    where: { id }, include: { lesson: true, mediaRef: true },

  })
}
export async function createUpdateMany(items: any[]) {
  return prisma.$transaction(
    items.map(item =>
      prisma.lessonMedia.upsert({
        where: { id: item.id },         // or unique field (mediaId, uuid, etc.)
        update: item,
        create: item
      })
    )
  );
}

export async function updateLessonMedia(id: number, data: any) {
  return prisma.lessonMedia.update({ where: { id }, data })
}


export async function changeCourseStatus(uuid: string) {
  const Course = await prisma.course.findUnique({ where: { uuid } });
  if (!Course) throw new Error("Course not found");

  return prisma.course.update({
    where: { uuid },
    data: { is_active: !Course.is_active },
  });
}
export async function changeLessonStatus(uuid: string) {
  const lesson = await prisma.lesson.findUnique({ where: { uuid } });
  if (!lesson) throw new Error("Lesson not found");

  return prisma.lesson.update({
    where: { uuid },
    data: { is_active: !lesson.is_active },
  });
}
export async function LessonMediaStatus(id: number) {
  const lesson = await prisma.lessonMedia.findUnique({ where: { id } });
  if (!lesson) throw new Error("Lesson Media not found");

  return prisma.lessonMedia.update({
    where: { id },
    data: { is_active: !lesson.is_active },
  });
}


