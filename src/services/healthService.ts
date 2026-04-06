import prisma from '../prisma/client';

/**
 * Create a symptom entry
 * @param userId number
 * @param symptoms string[]  (array of symptom strings)
 */
export async function addSymptomEntry(userId: number, symptoms: string[]) {
  if (!Array.isArray(symptoms)) {
    throw new Error('symptoms must be an array of strings');
  }
  const cleaned = symptoms
    .map(s => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean);
  console.log(cleaned);

  const entry = await prisma.symptomEntry.create({
    data: {
      userId,
      symptoms: symptoms, // stored as JSON
    },
  });

  return entry;
}

/**
 * Get unique symptom strings for last `days` days (default 30).
 */
export async function getUniqueSymptomsLastNDays(days = 30): Promise<{ uniqueSymptoms: string[]; count: number }> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  // normalize to start of day and end of day for inclusive range
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const rows = await prisma.symptomEntry.findMany({
    where: {
      created_at: {
        gte: start,
        lte: end,
      },
    },
    select: {
      symptoms: true,
    },
  });

  const uniqueSet = new Set<string>();

  for (const r of rows) {
    const s = r.symptoms;
    if (!s) continue;

    if (Array.isArray(s)) {
      for (const v of s) {
        if (typeof v === 'string' && v.trim()) {
          const split = v.split(',').map(x => x.trim()).filter(Boolean);
          split.forEach(item => uniqueSet.add(item));
        }
      }
    } else if (typeof s === 'string') {
      const split = s.split(',').map(x => x.trim()).filter(Boolean);
      split.forEach(item => uniqueSet.add(item));
    }

  }

  const arr = Array.from(uniqueSet);
  return { uniqueSymptoms: arr, count: arr.length };
}