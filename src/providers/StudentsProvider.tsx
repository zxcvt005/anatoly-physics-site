'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { StudentFormInput } from '@/lib/students/form';
import {
  type CrmLoadState,
  getStrictSupabaseInitialLoadState,
  isCrmEntityHydrated,
  isStrictSupabaseMode,
  shouldFallbackMigratedEntityToLocalStorage,
} from '@/lib/crm/data-source';
import { hydrateMigratedEntity } from '@/lib/crm/supabase-entity-hydration';
import {
  readStudentsFromLocalStorage,
  writeStudentsToLocalStorage,
} from '@/lib/students/local-storage';
import { shouldUseSupabaseForStudents } from '@/lib/supabase/env';
import { fetchStudentPortalStudents } from '@/lib/crm/api/student-portal';
import {
  deleteStudentFromSupabase,
  fetchStudentsFromSupabase,
  insertStudentToSupabase,
  seedStudentsToSupabase,
  updateStudentInSupabase,
} from '@/lib/crm/api/students';
import {
  formatStudentDeleteError,
  generateStudentId,
  generateStudentToken,
  normalizeStudent,
} from '@/lib/student-utils';
import type { Student } from '@/types/tutor';

export type { StudentFormInput } from '@/lib/students/form';

type StudentsDataSource = 'supabase' | 'localStorage' | 'student-portal';

export type DeleteStudentResult =
  | { ok: true }
  | { ok: false; error: string };

interface StudentsContextValue {
  students: Student[];
  hydrated: boolean;
  loadState: CrmLoadState;
  loadError: string | null;
  addStudent: (input: StudentFormInput) => Student;
  updateStudent: (studentId: string, input: StudentFormInput) => void;
  deleteStudent: (studentId: string) => Promise<DeleteStudentResult>;
  getStudentById: (studentId: string) => Student | undefined;
  getStudentByToken: (token: string) => Student | undefined;
}

const StudentsContext = createContext<StudentsContextValue | null>(null);

function buildStudentFromInput(
  input: StudentFormInput,
  existingTokens: Set<string>,
  existingStudent?: Student,
): Student {
  const token =
    existingStudent?.token ??
    generateStudentToken(input.lastName, existingTokens);

  return normalizeStudent({
    id: existingStudent?.id ?? generateStudentId(),
    firstName: input.firstName,
    lastName: input.lastName,
    gradeClass: input.gradeClass,
    rate4Weeks: input.rate4Weeks,
    lessonsPerWeek: input.lessonsPerWeek,
    parentContacts: input.parentContacts?.trim() || undefined,
    activityStatus: input.activityStatus ?? 'active',
    pauseComment:
      input.activityStatus === 'paused'
        ? input.pauseComment?.trim() || undefined
        : undefined,
    token,
    name: '',
    ratePerLesson: 0,
  });
}

export function StudentsProvider({
  children,
  initialStudents,
  studentPortalToken,
}: {
  children: React.ReactNode;
  initialStudents: Student[];
  studentPortalToken?: string;
}) {
  const normalizedInitialStudents = useMemo(
    () => initialStudents.map(normalizeStudent),
    [initialStudents],
  );

  const [students, setStudents] = useState<Student[]>(() =>
    isStrictSupabaseMode() ? [] : normalizedInitialStudents,
  );
  const [loadState, setLoadState] = useState<CrmLoadState>(
    getStrictSupabaseInitialLoadState,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const hydrated = isCrmEntityHydrated(loadState);
  const dataSourceRef = useRef<StudentsDataSource>('localStorage');

  useEffect(() => {
    let cancelled = false;

    async function hydrateStudents() {
      const usePortalApi = Boolean(studentPortalToken);
      const result = await hydrateMigratedEntity({
        entityLabel: 'students',
        useSupabase: usePortalApi || shouldUseSupabaseForStudents(),
        fetchFromSupabase: usePortalApi
          ? () => fetchStudentPortalStudents(studentPortalToken!)
          : fetchStudentsFromSupabase,
        readLocalFallback: () =>
          isStrictSupabaseMode()
            ? []
            : readStudentsFromLocalStorage(normalizedInitialStudents),
        readLocalSeedSource: () =>
          readStudentsFromLocalStorage(normalizedInitialStudents),
        seedToSupabase: usePortalApi ? undefined : seedStudentsToSupabase,
        getLength: (data) => data.length,
      });

      if (cancelled) {
        return;
      }

      if (result.status === 'error') {
        setStudents([]);
        setLoadState('error');
        setLoadError(result.error);
        dataSourceRef.current = 'localStorage';
        return;
      }

      setStudents(result.data);
      dataSourceRef.current = studentPortalToken ? 'student-portal' : result.source;
      setLoadState('ready');
      setLoadError(null);
    }

    void hydrateStudents();

    return () => {
      cancelled = true;
    };
  }, [normalizedInitialStudents, studentPortalToken]);

  useEffect(() => {
    if (
      !hydrated ||
      dataSourceRef.current !== 'localStorage' ||
      !shouldFallbackMigratedEntityToLocalStorage()
    ) {
      return;
    }

    writeStudentsToLocalStorage(students);
  }, [students, hydrated]);

  const getStudentById = useCallback(
    (studentId: string) => students.find((student) => student.id === studentId),
    [students],
  );

  const getStudentByToken = useCallback(
    (token: string) => students.find((student) => student.token === token),
    [students],
  );

  const addStudent = useCallback(
    (input: StudentFormInput) => {
      let createdStudent: Student | null = null;

      setStudents((current) => {
        const tokens = new Set(current.map((student) => student.token));
        const student = buildStudentFromInput(input, tokens);
        createdStudent = student;
        return [...current, student];
      });

      const student = createdStudent!;

      if (dataSourceRef.current === 'supabase') {
        void insertStudentToSupabase(student).then((result) => {
          if (result.ok) {
            setStudents((current) =>
              current.map((item) =>
                item.id === student.id ? result.data : item,
              ),
            );
            return;
          }

          console.error('[students] Supabase insert failed:', result.error);
          setStudents((current) =>
            current.filter((item) => item.id !== student.id),
          );
        });
      }

      return student;
    },
    [],
  );

  const updateStudent = useCallback(
    (studentId: string, input: StudentFormInput) => {
      let previousStudent: Student | undefined;
      let updatedStudent: Student | undefined;

      setStudents((current) =>
        current.map((student) => {
          if (student.id !== studentId) {
            return student;
          }

          previousStudent = student;
          updatedStudent = buildStudentFromInput(
            input,
            new Set(current.map((item) => item.token)),
            student,
          );
          return updatedStudent;
        }),
      );

      if (!previousStudent || !updatedStudent) {
        return;
      }

      if (dataSourceRef.current === 'supabase') {
        void updateStudentInSupabase(
          studentId,
          input,
          previousStudent,
        ).then((result) => {
          if (result.ok) {
            setStudents((current) =>
              current.map((item) =>
                item.id === studentId ? result.data : item,
              ),
            );
            return;
          }

          console.error('[students] Supabase update failed:', result.error);
          setStudents((current) =>
            current.map((item) =>
              item.id === studentId ? previousStudent! : item,
            ),
          );
        });
      }
    },
    [],
  );

  const deleteStudent = useCallback(
    async (studentId: string): Promise<DeleteStudentResult> => {
      let targetStudent: Student | undefined;

      setStudents((current) => {
        targetStudent = current.find((student) => student.id === studentId);
        return current;
      });

      if (!targetStudent) {
        return { ok: false, error: 'Ученик не найден' };
      }

      if (dataSourceRef.current === 'supabase') {
        const result = await deleteStudentFromSupabase(studentId);

        if (!result.ok) {
          console.error('[students] Supabase delete failed:', result.error);
          return {
            ok: false,
            error: formatStudentDeleteError(result.error),
          };
        }
      }

      setStudents((current) =>
        current.filter((student) => student.id !== studentId),
      );

      return { ok: true };
    },
    [],
  );

  const value = useMemo(
    () => ({
      students,
      hydrated,
      loadState,
      loadError,
      addStudent,
      updateStudent,
      deleteStudent,
      getStudentById,
      getStudentByToken,
    }),
    [
      students,
      hydrated,
      loadState,
      loadError,
      addStudent,
      updateStudent,
      deleteStudent,
      getStudentById,
      getStudentByToken,
    ],
  );

  return (
    <StudentsContext.Provider value={value}>{children}</StudentsContext.Provider>
  );
}

export function useStudents() {
  const context = useContext(StudentsContext);
  if (!context) {
    throw new Error('useStudents must be used within StudentsProvider');
  }
  return context;
}
