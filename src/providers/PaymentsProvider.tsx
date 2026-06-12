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
import {
  type CrmLoadState,
  getStrictSupabaseInitialLoadState,
  isCrmEntityHydrated,
  isStrictSupabaseMode,
  shouldFallbackMigratedEntityToLocalStorage,
} from '@/lib/crm/data-source';
import { hydrateMigratedEntity } from '@/lib/crm/supabase-entity-hydration';
import {
  readPaymentsFromLocalStorage,
  writePaymentsToLocalStorage,
} from '@/lib/payments/local-storage';
import { shouldUseSupabaseForPayments } from '@/lib/supabase/env';
import {
  fetchStudentPortalPayments,
  insertStudentPortalPendingPayment,
} from '@/lib/crm/api/student-portal';
import {
  insertPaymentToSupabase,
  fetchPaymentsFromSupabase,
  seedPaymentsToSupabase,
  setPaymentTaxAccountedInSupabase,
  updatePaymentStatusInSupabase,
} from '@/lib/crm/api/payments';
import type { Payment, PaymentStatus } from '@/types/tutor';

interface AddPendingPaymentInput {
  studentId: string;
  amount: number;
  note?: string;
}

export interface AddPaymentInput {
  studentId: string;
  amount: number;
  status: PaymentStatus;
  /** YYYY-MM-DD */
  paymentDate: string;
  note?: string;
}

interface PaymentsContextValue {
  payments: Payment[];
  hydrated: boolean;
  loadState: CrmLoadState;
  loadError: string | null;
  pendingPayments: Payment[];
  pendingCount: number;
  addPendingPayment: (input: AddPendingPaymentInput) => Payment;
  addPayment: (input: AddPaymentInput) => Payment;
  updatePaymentStatus: (paymentId: string, status: PaymentStatus) => void;
  confirmPayment: (paymentId: string) => void;
  rejectPayment: (paymentId: string) => void;
  setPaymentTaxAccounted: (paymentId: string, taxAccounted: boolean) => void;
}

type PaymentsDataSource = 'supabase' | 'localStorage' | 'student-portal';

const PaymentsContext = createContext<PaymentsContextValue | null>(null);

function generatePaymentId(): string {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function paymentDateToCreatedAt(paymentDate: string): string {
  return `${paymentDate}T12:00:00`;
}

export function PaymentsProvider({
  children,
  initialPayments,
  studentPortalToken,
}: {
  children: React.ReactNode;
  initialPayments: Payment[];
  studentPortalToken?: string;
}) {
  const [payments, setPayments] = useState<Payment[]>(() =>
    isStrictSupabaseMode() ? [] : initialPayments,
  );
  const [loadState, setLoadState] = useState<CrmLoadState>(
    getStrictSupabaseInitialLoadState,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const hydrated = isCrmEntityHydrated(loadState);
  const dataSourceRef = useRef<PaymentsDataSource>('localStorage');

  useEffect(() => {
    let cancelled = false;

    async function hydratePayments() {
      const usePortalApi = Boolean(studentPortalToken);
      const result = await hydrateMigratedEntity({
        entityLabel: 'payments',
        useSupabase: usePortalApi || shouldUseSupabaseForPayments(),
        fetchFromSupabase: usePortalApi
          ? () => fetchStudentPortalPayments(studentPortalToken!)
          : fetchPaymentsFromSupabase,
        readLocalFallback: () =>
          isStrictSupabaseMode()
            ? []
            : readPaymentsFromLocalStorage(initialPayments),
        readLocalSeedSource: () => readPaymentsFromLocalStorage(initialPayments),
        seedToSupabase: usePortalApi ? undefined : seedPaymentsToSupabase,
        getLength: (data) => data.length,
      });

      if (cancelled) {
        return;
      }

      if (result.status === 'error') {
        setPayments([]);
        setLoadState('error');
        setLoadError(result.error);
        dataSourceRef.current = 'localStorage';
        return;
      }

      setPayments(result.data);
      dataSourceRef.current = studentPortalToken ? 'student-portal' : result.source;
      setLoadState('ready');
      setLoadError(null);
    }

    void hydratePayments();

    return () => {
      cancelled = true;
    };
  }, [initialPayments, studentPortalToken]);

  useEffect(() => {
    if (
      !hydrated ||
      dataSourceRef.current !== 'localStorage' ||
      !shouldFallbackMigratedEntityToLocalStorage()
    ) {
      return;
    }

    writePaymentsToLocalStorage(payments);
  }, [payments, hydrated]);

  const updatePaymentStatus = useCallback(
    (paymentId: string, status: PaymentStatus) => {
      let previousPayment: Payment | undefined;

      setPayments((current) =>
        current.map((payment) => {
          if (payment.id !== paymentId) {
            return payment;
          }

          previousPayment = payment;
          return { ...payment, status };
        }),
      );

      if (!previousPayment) {
        return;
      }

      if (dataSourceRef.current === 'supabase') {
        void updatePaymentStatusInSupabase(paymentId, status).then((result) => {
          if (result.ok) {
            setPayments((current) =>
              current.map((payment) =>
                payment.id === paymentId ? result.data : payment,
              ),
            );
            return;
          }

          console.error('[payments] Supabase update failed:', result.error);
          setPayments((current) =>
            current.map((payment) =>
              payment.id === paymentId ? previousPayment! : payment,
            ),
          );
        });
      }
    },
    [],
  );

  const confirmPayment = useCallback(
    (paymentId: string) => updatePaymentStatus(paymentId, 'confirmed'),
    [updatePaymentStatus],
  );

  const rejectPayment = useCallback(
    (paymentId: string) => updatePaymentStatus(paymentId, 'rejected'),
    [updatePaymentStatus],
  );

  const setPaymentTaxAccounted = useCallback(
    (paymentId: string, taxAccounted: boolean) => {
      let previousPayment: Payment | undefined;

      setPayments((current) =>
        current.map((payment) => {
          if (payment.id !== paymentId) {
            return payment;
          }

          previousPayment = payment;
          return { ...payment, taxAccounted };
        }),
      );

      if (!previousPayment) {
        return;
      }

      if (dataSourceRef.current === 'supabase') {
        void setPaymentTaxAccountedInSupabase(paymentId, taxAccounted).then(
          (result) => {
            if (result.ok) {
              setPayments((current) =>
                current.map((payment) =>
                  payment.id === paymentId ? result.data : payment,
                ),
              );
              return;
            }

            console.error('[payments] Supabase update failed:', result.error);
            setPayments((current) =>
              current.map((payment) =>
                payment.id === paymentId ? previousPayment! : payment,
              ),
            );
          },
        );
      }
    },
    [],
  );

  const addPendingPayment = useCallback((input: AddPendingPaymentInput) => {
    let createdPayment: Payment | null = null;

    setPayments((current) => {
      const payment: Payment = {
        id: generatePaymentId(),
        studentId: input.studentId,
        amount: input.amount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        note: input.note,
      };
      createdPayment = payment;
      return [payment, ...current];
    });

    const payment = createdPayment!;

    if (
      dataSourceRef.current === 'supabase' ||
      dataSourceRef.current === 'student-portal'
    ) {
      const persistPayment = studentPortalToken
        ? insertStudentPortalPendingPayment(studentPortalToken, payment)
        : insertPaymentToSupabase(payment);

      void persistPayment.then((result) => {
        if (result.ok) {
          setPayments((current) =>
            current.map((item) =>
              item.id === payment.id ? result.data : item,
            ),
          );
          return;
        }

        console.error('[payments] Supabase insert failed:', result.error);
        setPayments((current) =>
          current.filter((item) => item.id !== payment.id),
        );
      });
    }

    return payment;
  }, [studentPortalToken]);

  const addPayment = useCallback((input: AddPaymentInput) => {
    let createdPayment: Payment | null = null;

    setPayments((current) => {
      const payment: Payment = {
        id: generatePaymentId(),
        studentId: input.studentId,
        amount: input.amount,
        status: input.status,
        createdAt: paymentDateToCreatedAt(input.paymentDate),
        note: input.note,
        taxAccounted: input.status === 'confirmed' ? false : undefined,
      };
      createdPayment = payment;
      return [payment, ...current];
    });

    const payment = createdPayment!;

    if (dataSourceRef.current === 'supabase') {
      void insertPaymentToSupabase(payment).then((result) => {
        if (result.ok) {
          setPayments((current) =>
            current.map((item) =>
              item.id === payment.id ? result.data : item,
            ),
          );
          return;
        }

        console.error('[payments] Supabase insert failed:', result.error);
        setPayments((current) =>
          current.filter((item) => item.id !== payment.id),
        );
      });
    }

    return payment;
  }, []);

  const pendingPayments = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === 'pending')
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [payments],
  );

  const value = useMemo(
    () => ({
      payments,
      hydrated,
      loadState,
      loadError,
      pendingPayments,
      pendingCount: pendingPayments.length,
      addPendingPayment,
      addPayment,
      updatePaymentStatus,
      confirmPayment,
      rejectPayment,
      setPaymentTaxAccounted,
    }),
    [
      payments,
      hydrated,
      loadState,
      loadError,
      pendingPayments,
      addPendingPayment,
      addPayment,
      updatePaymentStatus,
      confirmPayment,
      rejectPayment,
      setPaymentTaxAccounted,
    ],
  );

  return (
    <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>
  );
}

export function usePayments() {
  const context = useContext(PaymentsContext);
  if (!context) {
    throw new Error('usePayments must be used within PaymentsProvider');
  }
  return context;
}

export function getPaymentsForStudentFromList(
  payments: Payment[],
  studentId: string,
): Payment[] {
  return payments
    .filter((payment) => payment.studentId === studentId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}
