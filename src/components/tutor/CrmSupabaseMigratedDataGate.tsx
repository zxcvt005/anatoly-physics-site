'use client';

import {
  CRM_DATABASE_ERROR_MESSAGE,
  type CrmLoadState,
  isStrictSupabaseMode,
} from '@/lib/crm/data-source';
import { usePayments } from '@/providers/PaymentsProvider';
import { useScheduleSlots } from '@/providers/ScheduleSlotsProvider';
import { useStudents } from '@/providers/StudentsProvider';
import { TutorPageShell } from '@/components/tutor/TutorPageShell';

interface CrmSupabaseMigratedDataGateProps {
  children: React.ReactNode;
  requirePayments?: boolean;
  title?: string;
  subtitle?: string;
}

function pickBlockingState(
  states: CrmLoadState[],
): 'loading' | 'error' | null {
  if (states.includes('error')) {
    return 'error';
  }

  if (states.includes('loading')) {
    return 'loading';
  }

  return null;
}

function LoadingPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-8 text-center text-zinc-500">
      {message}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-900/50 bg-red-950/20 px-5 py-8 text-center text-red-300">
      {message}
    </div>
  );
}

function CrmSupabaseStudentsSlotsGate({
  children,
  title = 'Загрузка…',
  subtitle = 'CRM',
}: Omit<CrmSupabaseMigratedDataGateProps, 'requirePayments'>) {
  const { loadState: studentsState, loadError: studentsError } = useStudents();
  const { loadState: slotsState, loadError: slotsError } = useScheduleSlots();

  const blockingState = pickBlockingState([studentsState, slotsState]);

  if (blockingState === 'loading') {
    return (
      <TutorPageShell title={title} subtitle={subtitle}>
        <LoadingPanel message="Загрузка данных…" />
      </TutorPageShell>
    );
  }

  if (blockingState === 'error') {
    return (
      <TutorPageShell title="Ошибка" subtitle={subtitle}>
        <ErrorPanel
          message={studentsError ?? slotsError ?? CRM_DATABASE_ERROR_MESSAGE}
        />
      </TutorPageShell>
    );
  }

  return children;
}

function CrmSupabaseStudentsSlotsPaymentsGate({
  children,
  title = 'Загрузка…',
  subtitle = 'CRM',
}: Omit<CrmSupabaseMigratedDataGateProps, 'requirePayments'>) {
  const { loadState: studentsState, loadError: studentsError } = useStudents();
  const { loadState: slotsState, loadError: slotsError } = useScheduleSlots();
  const { loadState: paymentsState, loadError: paymentsError } = usePayments();

  const blockingState = pickBlockingState([
    studentsState,
    slotsState,
    paymentsState,
  ]);

  if (blockingState === 'loading') {
    return (
      <TutorPageShell title={title} subtitle={subtitle}>
        <LoadingPanel message="Загрузка данных…" />
      </TutorPageShell>
    );
  }

  if (blockingState === 'error') {
    return (
      <TutorPageShell title="Ошибка" subtitle={subtitle}>
        <ErrorPanel
          message={
            studentsError ??
            slotsError ??
            paymentsError ??
            CRM_DATABASE_ERROR_MESSAGE
          }
        />
      </TutorPageShell>
    );
  }

  return children;
}

export function CrmSupabaseMigratedDataGate({
  children,
  requirePayments = false,
  title,
  subtitle,
}: CrmSupabaseMigratedDataGateProps) {
  if (!isStrictSupabaseMode()) {
    return children;
  }

  if (requirePayments) {
    return (
      <CrmSupabaseStudentsSlotsPaymentsGate title={title} subtitle={subtitle}>
        {children}
      </CrmSupabaseStudentsSlotsPaymentsGate>
    );
  }

  return (
    <CrmSupabaseStudentsSlotsGate title={title} subtitle={subtitle}>
      {children}
    </CrmSupabaseStudentsSlotsGate>
  );
}
