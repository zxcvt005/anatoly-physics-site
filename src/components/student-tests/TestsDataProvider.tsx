'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { buildTestsNavigation } from '@/lib/tests/student-navigation';
import type { TestsNavItem } from '@/lib/tests/student-navigation';
import type { StudentHomeworkListItem } from '@/types/tests';

interface StudentTestsData {
  homework: StudentHomeworkListItem[];
}

interface TestsDataContextValue {
  token: string;
  homework: StudentHomeworkListItem[];
  navigation: TestsNavItem[];
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
}

const TestsDataContext = createContext<TestsDataContextValue | null>(null);

export function TestsDataProvider({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  const [homework, setHomework] = useState<StudentHomeworkListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(`/api/student/${token}/tests`, {
        cache: 'no-store',
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: StudentTestsData;
        error?: string;
      };

      if (!body.ok || !body.data) {
        setLoadError(body.error ?? 'Не удалось загрузить тесты');
        setHomework([]);
      } else {
        setHomework(body.data.homework);
      }
    } catch {
      setLoadError('Не удалось загрузить тесты');
      setHomework([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const navigation = useMemo(
    () => buildTestsNavigation(token, homework),
    [token, homework],
  );

  const value = useMemo(
    () => ({
      token,
      homework,
      navigation,
      loading,
      loadError,
      reload: load,
    }),
    [token, homework, navigation, loading, loadError, load],
  );

  return (
    <TestsDataContext.Provider value={value}>{children}</TestsDataContext.Provider>
  );
}

export function useTestsData(): TestsDataContextValue {
  const context = useContext(TestsDataContext);
  if (!context) {
    throw new Error('useTestsData must be used within TestsDataProvider');
  }
  return context;
}
