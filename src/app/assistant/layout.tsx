'use client';

import {
  intensives,
  lessons,
  scheduleSlots,
  studentIntensiveProgress,
  students,
} from '@/lib/mock-data';
import { getMockCrmInitialData } from '@/lib/crm/data-source';
import { CrmSupabaseMigratedDataGate } from '@/components/tutor/CrmSupabaseMigratedDataGate';
import { IntensivesProvider } from '@/providers/IntensivesProvider';
import { LessonsProvider } from '@/providers/LessonsProvider';
import { ScheduleSlotsProvider } from '@/providers/ScheduleSlotsProvider';
import { StudentsProvider } from '@/providers/StudentsProvider';

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudentsProvider initialStudents={getMockCrmInitialData(students)}>
      <ScheduleSlotsProvider initialSlots={getMockCrmInitialData(scheduleSlots)}>
        <LessonsProvider initialLessons={getMockCrmInitialData(lessons)}>
          <IntensivesProvider
            initialIntensives={getMockCrmInitialData(intensives)}
            initialProgress={getMockCrmInitialData(studentIntensiveProgress)}
          >
            <CrmSupabaseMigratedDataGate
              title="Ассистентка"
              subtitle="Отметки и расписание"
            >
              {children}
            </CrmSupabaseMigratedDataGate>
          </IntensivesProvider>
        </LessonsProvider>
      </ScheduleSlotsProvider>
    </StudentsProvider>
  );
}
