'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchFreshStudentPortalData } from '@/lib/crm/api/student-portal';
import {
  initialNegativeBalanceNoticeState,
  readStudentLessonBalance,
  reduceNegativeBalanceNotice,
  type NegativeBalanceNoticeState,
} from '@/lib/negative-lesson-balance-notice';
import { useLessons } from '@/providers/LessonsProvider';
import { usePayments } from '@/providers/PaymentsProvider';
import type { Lesson, Payment, Student } from '@/types/tutor';

export function useNegativeLessonBalanceNotice(student: Student, token: string) {
  const { lessons, hydrated: lessonsHydrated } = useLessons();
  const { payments, hydrated: paymentsHydrated } = usePayments();
  const [notice, setNotice] = useState<NegativeBalanceNoticeState>(
    initialNegativeBalanceNoticeState,
  );
  const requestSeqRef = useRef(0);
  const serverBalanceAppliedRef = useRef(false);

  const publishBalance = useCallback((remainingLessons: number) => {
    setNotice((current) =>
      reduceNegativeBalanceNotice(current, {
        type: 'balance',
        remainingLessons,
      }),
    );
  }, []);

  const publishFromPayload = useCallback(
    (nextStudent: Student, nextLessons: Lesson[], nextPayments: Payment[]) => {
      publishBalance(
        readStudentLessonBalance(nextStudent, nextLessons, nextPayments),
      );
    },
    [publishBalance],
  );

  useEffect(() => {
    if (serverBalanceAppliedRef.current) return;
    if (!lessonsHydrated || !paymentsHydrated) return;

    publishFromPayload(student, lessons, payments);
  }, [
    lessons,
    lessonsHydrated,
    payments,
    paymentsHydrated,
    publishFromPayload,
    student,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function refreshFromServer() {
      const requestSeq = requestSeqRef.current + 1;
      requestSeqRef.current = requestSeq;

      const result = await fetchFreshStudentPortalData(token);

      if (cancelled || requestSeq !== requestSeqRef.current || !result.ok) {
        return;
      }

      serverBalanceAppliedRef.current = true;
      publishFromPayload(
        result.data.student,
        result.data.lessons,
        result.data.payments,
      );
    }

    void refreshFromServer();

    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      void refreshFromServer();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [publishFromPayload, token]);

  const dismiss = useCallback(() => {
    setNotice((current) =>
      reduceNegativeBalanceNotice(current, { type: 'dismiss' }),
    );
  }, []);

  return {
    open: notice.open,
    deficitLessons: notice.deficitLessons,
    dismiss,
  };
}
