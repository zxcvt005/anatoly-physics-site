'use client';

import { useMemo } from 'react';
import { AdminHistoryCenter } from '@/components/tutor/AdminHistoryCenter';
import { AdminNotificationsCenter } from '@/components/tutor/AdminNotificationsCenter';
import { AdminRevenueCenter } from '@/components/tutor/AdminRevenueCenter';
import { AdminStudentsCenter } from '@/components/tutor/AdminStudentsCenter';
import { AdminTrialLessonsCenter } from '@/components/tutor/AdminTrialLessonsCenter';
import { useStudents } from '@/providers/StudentsProvider';

export function AdminHeaderActions() {
  const { students } = useStudents();

  const studentsById = useMemo(() => {
    const map = new Map<string, (typeof students)[number]>();
    for (const student of students) {
      map.set(student.id, student);
    }
    return map;
  }, [students]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AdminStudentsCenter />
      <AdminTrialLessonsCenter />
      <AdminHistoryCenter />
      <AdminRevenueCenter />
      <AdminNotificationsCenter studentsById={studentsById} />
    </div>
  );
}
