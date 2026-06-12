'use client';

import {
  lessons,
  payments,
  revenueMonthSnapshots,
  scheduleSlots,
  students,
  trialLessons,
} from '@/lib/mock-data';
import { getMockCrmInitialData } from '@/lib/crm/data-source';
import { CrmSupabaseMigratedDataGate } from '@/components/tutor/CrmSupabaseMigratedDataGate';
import { LessonsProvider } from '@/providers/LessonsProvider';
import { PaymentsProvider } from '@/providers/PaymentsProvider';
import { RevenueSnapshotsProvider } from '@/providers/RevenueSnapshotsProvider';
import { ScheduleSlotsProvider } from '@/providers/ScheduleSlotsProvider';
import { StudentsProvider } from '@/providers/StudentsProvider';
import { TrialLessonsProvider } from '@/providers/TrialLessonsProvider';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudentsProvider initialStudents={getMockCrmInitialData(students)}>
      <TrialLessonsProvider initialTrialLessons={getMockCrmInitialData(trialLessons)}>
        <ScheduleSlotsProvider initialSlots={getMockCrmInitialData(scheduleSlots)}>
          <LessonsProvider initialLessons={getMockCrmInitialData(lessons)}>
            <PaymentsProvider initialPayments={getMockCrmInitialData(payments)}>
              <RevenueSnapshotsProvider
                initialSnapshots={getMockCrmInitialData(revenueMonthSnapshots)}
              >
                <CrmSupabaseMigratedDataGate
                  requirePayments
                  title="Админка"
                  subtitle="Управление CRM"
                >
                  {children}
                </CrmSupabaseMigratedDataGate>
              </RevenueSnapshotsProvider>
            </PaymentsProvider>
          </LessonsProvider>
        </ScheduleSlotsProvider>
      </TrialLessonsProvider>
    </StudentsProvider>
  );
}
