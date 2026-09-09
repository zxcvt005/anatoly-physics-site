'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createMockExam,
  deleteMockExam,
  fetchMockExamsBundle,
  updateMockExam,
  upsertMockExamResult,
} from '@/lib/crm/api/mock-exams';
import { sortMockExamsChronologically } from '@/lib/mock-exams/calculations';
import type {
  MockExam,
  MockExamResult,
  MockExamUpdateInput,
} from '@/lib/mock-exams/types';
import {
  generateMockExamId,
  resultKey,
} from '@/lib/mock-exams/validation';
import { sortStudentsByName } from '@/providers/IntensivesProvider';
import type { Student } from '@/types/tutor';

type MockExamsContextValue = {
  exams: MockExam[];
  resultsByKey: Map<string, MockExamResult>;
  isLoading: boolean;
  loadError: string | null;
  cellError: string | null;
  getScore: (studentId: string, mockExamId: string) => number | null;
  saveScore: (
    studentId: string,
    mockExamId: string,
    raw: string,
  ) => Promise<boolean>;
  addExam: (input: {
    title: string;
    examDate: string;
    maxScore: number;
  }) => Promise<boolean>;
  editExam: (
    mockExamId: string,
    input: MockExamUpdateInput,
  ) => Promise<boolean>;
  removeExam: (mockExamId: string) => Promise<boolean>;
  reload: () => Promise<void>;
};

const MockExamsContext = createContext<MockExamsContextValue | null>(null);

export { sortStudentsByName };

export function MockExamsProvider({ children }: { children: React.ReactNode }) {
  const [exams, setExams] = useState<MockExam[]>([]);
  const [resultsByKey, setResultsByKey] = useState<Map<string, MockExamResult>>(
    () => new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cellError, setCellError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    const result = await fetchMockExamsBundle();
    if (!result.ok) {
      setLoadError(result.error);
      setIsLoading(false);
      return;
    }

    const next = new Map<string, MockExamResult>();
    for (const item of result.data.results) {
      next.set(resultKey(item.studentId, item.mockExamId), item);
    }
    setExams(sortMockExamsChronologically(result.data.exams));
    setResultsByKey(next);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const getScore = useCallback(
    (studentId: string, mockExamId: string) => {
      const result = resultsByKey.get(resultKey(studentId, mockExamId));
      return result ? result.score : null;
    },
    [resultsByKey],
  );

  const saveScore = useCallback(
    async (studentId: string, mockExamId: string, raw: string) => {
      setCellError(null);
      const key = resultKey(studentId, mockExamId);
      const previous = resultsByKey.get(key) ?? null;

      const trimmed = raw.trim();
      setResultsByKey((current) => {
        const next = new Map(current);
        if (trimmed === '') {
          next.delete(key);
        } else {
          const parsed = Number.parseInt(trimmed, 10);
          if (Number.isFinite(parsed)) {
            next.set(key, {
              id: previous?.id ?? `temp-${key}`,
              studentId,
              mockExamId,
              score: parsed,
            });
          }
        }
        return next;
      });

      const result = await upsertMockExamResult(studentId, mockExamId, raw);
      if (!result.ok) {
        setResultsByKey((current) => {
          const next = new Map(current);
          if (previous) {
            next.set(key, previous);
          } else {
            next.delete(key);
          }
          return next;
        });
        setCellError(result.error);
        return false;
      }

      setResultsByKey((current) => {
        const next = new Map(current);
        if (result.data) {
          next.set(key, result.data);
        } else {
          next.delete(key);
        }
        return next;
      });
      return true;
    },
    [resultsByKey],
  );

  const addExam = useCallback(
    async (input: { title: string; examDate: string; maxScore: number }) => {
      const exam: MockExam = {
        id: generateMockExamId(),
        title: input.title,
        examDate: input.examDate,
        maxScore: input.maxScore,
      };
      const result = await createMockExam(exam);
      if (!result.ok) {
        setCellError(result.error);
        return false;
      }
      setExams((current) =>
        sortMockExamsChronologically([...current, result.data]),
      );
      return true;
    },
    [],
  );

  const editExam = useCallback(
    async (mockExamId: string, input: MockExamUpdateInput) => {
      const result = await updateMockExam(mockExamId, input);
      if (!result.ok) {
        setCellError(result.error);
        return false;
      }
      setExams((current) =>
        sortMockExamsChronologically(
          current.map((exam) => (exam.id === mockExamId ? result.data : exam)),
        ),
      );
      return true;
    },
    [],
  );

  const removeExam = useCallback(async (mockExamId: string) => {
    const result = await deleteMockExam(mockExamId);
    if (!result.ok) {
      setCellError(result.error);
      return false;
    }
    setExams((current) => current.filter((exam) => exam.id !== mockExamId));
    setResultsByKey((current) => {
      const next = new Map(current);
      for (const key of next.keys()) {
        if (key.endsWith(`:${mockExamId}`)) {
          next.delete(key);
        }
      }
      return next;
    });
    return true;
  }, []);

  const value = useMemo(
    () => ({
      exams,
      resultsByKey,
      isLoading,
      loadError,
      cellError,
      getScore,
      saveScore,
      addExam,
      editExam,
      removeExam,
      reload,
    }),
    [
      exams,
      resultsByKey,
      isLoading,
      loadError,
      cellError,
      getScore,
      saveScore,
      addExam,
      editExam,
      removeExam,
      reload,
    ],
  );

  return (
    <MockExamsContext.Provider value={value}>{children}</MockExamsContext.Provider>
  );
}

export function useMockExams(): MockExamsContextValue {
  const value = useContext(MockExamsContext);
  if (!value) {
    throw new Error('useMockExams must be used within MockExamsProvider');
  }
  return value;
}

export type { Student };
