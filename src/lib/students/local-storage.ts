import { normalizeStudent } from '@/lib/student-utils';
import type { Student } from '@/types/tutor';

export const STUDENTS_STORAGE_KEY = 'tutor-students-mock-v1';

export function readStudentsFromLocalStorage(fallback: Student[]): Student[] {
  if (typeof window === 'undefined') {
    return fallback.map(normalizeStudent);
  }

  const stored = localStorage.getItem(STUDENTS_STORAGE_KEY);
  if (!stored) {
    return fallback.map(normalizeStudent);
  }

  try {
    return (JSON.parse(stored) as Student[]).map(normalizeStudent);
  } catch {
    return fallback.map(normalizeStudent);
  }
}

export function writeStudentsToLocalStorage(students: Student[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
}
