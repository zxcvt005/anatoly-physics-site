import type { Student } from '@/types/tutor';

export function computeRatePerLesson(
  rate4Weeks: number,
  lessonsPerWeek: number,
): number {
  const totalLessons = lessonsPerWeek * 4;
  if (totalLessons <= 0 || rate4Weeks <= 0) return 0;
  return Math.round(rate4Weeks / totalLessons);
}

export function buildStudentName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function normalizeStudent(student: Student): Student {
  const ratePerLesson = computeRatePerLesson(
    student.rate4Weeks,
    student.lessonsPerWeek,
  );

  const activityStatus = student.activityStatus ?? 'active';

  return {
    ...student,
    firstName: student.firstName.trim(),
    lastName: student.lastName.trim(),
    name: buildStudentName(student.firstName, student.lastName),
    gradeClass: student.gradeClass.trim(),
    parentContacts: student.parentContacts?.trim() || undefined,
    activityStatus,
    pauseComment:
      activityStatus === 'paused'
        ? student.pauseComment?.trim() || undefined
        : undefined,
    ratePerLesson,
  };
}

export function isStudentPaused(student: Student): boolean {
  return (student.activityStatus ?? 'active') === 'paused';
}

export function filterActiveStudents(students: Student[]): Student[] {
  return students.filter((student) => !isStudentPaused(student));
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

function transliterate(value: string): string {
  return value
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]/g, '');
}

export function generateStudentToken(
  lastName: string,
  existingTokens: Set<string>,
): string {
  const year = new Date().getFullYear();
  const base = transliterate(lastName) || 'student';
  let candidate = `${base}${year}`;
  let counter = 1;

  while (existingTokens.has(candidate)) {
    candidate = `${base}${year}-${counter}`;
    counter += 1;
  }

  return candidate;
}

export function generateStudentId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function formatStudentDeleteError(error: string): string {
  return error.trim() || 'Не удалось удалить ученика';
}
