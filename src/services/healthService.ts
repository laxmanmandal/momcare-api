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
  
  const symptomsString = cleaned.join(',');

  const entry = await prisma.symptomEntry.create({
    data: {
      userId,
      symptoms: JSON.stringify(symptomsString),
    },
  });

  return {
    ...entry,
    symptoms: symptomsString
  };
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

    let processedString = '';

    try {
      if (typeof s === 'string' && (s.startsWith('[') || s.startsWith('{') || s.startsWith('"'))) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            if (typeof item === 'string' && item.trim()) {
              item.split(',').forEach(splitItem => {
                if (splitItem.trim()) uniqueSet.add(splitItem.trim());
              });
            }
          });
          continue;
        } else if (typeof parsed === 'string') {
          processedString = parsed;
        }
      } else {
        processedString = s as string;
      }
    } catch (e) {
      processedString = s as string;
    }

    if (processedString) {
      const split = processedString.split(',').map(x => x.trim()).filter(Boolean);
      split.forEach(item => uniqueSet.add(item));
    }
  }

  const arr = Array.from(uniqueSet);
  return { uniqueSymptoms: arr, count: arr.length };
}
