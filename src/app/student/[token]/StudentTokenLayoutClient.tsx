'use client';

import {
  intensives,
  lessons,
  payments,
  scheduleSlots,
  studentIntensiveProgress,
  students,
} from '@/lib/mock-data';
import { getMockCrmInitialData } from '@/lib/crm/data-source';
import { CrmSupabaseMigratedDataGate } from '@/components/tutor/CrmSupabaseMigratedDataGate';
import { IntensivesProvider } from '@/providers/IntensivesProvider';
import { LessonsProvider } from '@/providers/LessonsProvider';
import { PaymentsProvider } from '@/providers/PaymentsProvider';
import { ScheduleSlotsProvider } from '@/providers/ScheduleSlotsProvider';
import { StudentsProvider } from '@/providers/StudentsProvider';

export function StudentTokenLayoutClient({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  return (
    <StudentsProvider
      initialStudents={getMockCrmInitialData(students)}
      studentPortalToken={token}
    >
      <ScheduleSlotsProvider
        initialSlots={getMockCrmInitialData(scheduleSlots)}
        studentPortalToken={token}
      >
        <LessonsProvider
          initialLessons={getMockCrmInitialData(lessons)}
          studentPortalToken={token}
        >
          <PaymentsProvider
            initialPayments={getMockCrmInitialData(payments)}
            studentPortalToken={token}
          >
            <IntensivesProvider
              initialIntensives={getMockCrmInitialData(intensives)}
              initialProgress={getMockCrmInitialData(studentIntensiveProgress)}
              studentPortalToken={token}
            >
              <CrmSupabaseMigratedDataGate
                requirePayments
                title="Загрузка…"
                subtitle="Личный кабинет"
              >
                {children}
              </CrmSupabaseMigratedDataGate>
            </IntensivesProvider>
          </PaymentsProvider>
        </LessonsProvider>
      </ScheduleSlotsProvider>
    </StudentsProvider>
  );
}
