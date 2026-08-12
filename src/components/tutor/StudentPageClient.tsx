'use client';

import { notFound } from 'next/navigation';
import { StudentCabinet } from '@/components/tutor/StudentCabinet';
import { TutorPageShell } from '@/components/tutor/TutorPageShell';
import { CRM_DATABASE_ERROR_MESSAGE } from '@/lib/crm/data-source';
import { useStudents } from '@/providers/StudentsProvider';

interface StudentPageClientProps {
  token: string;
}

export function StudentPageClient({ token }: StudentPageClientProps) {
  const { getStudentByToken, hydrated, loadState, loadError } = useStudents();
  const student = getStudentByToken(token);

  if (loadState === 'error') {
    return (
      <TutorPageShell title="Ошибка" subtitle="Личный кабинет" badge="Для родителей">
        <div className="rounded-2xl border border-red-900/50 bg-red-950/20 px-5 py-8 text-center text-red-300">
          {loadError ?? CRM_DATABASE_ERROR_MESSAGE}
        </div>
      </TutorPageShell>
    );
  }

  if (hydrated && !student) {
    notFound();
  }

  if (!student) {
    return (
      <TutorPageShell title="Загрузка…" subtitle="Личный кабинет" badge="Для родителей">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-8 text-center text-zinc-500">
          Загрузка данных ученика…
        </div>
      </TutorPageShell>
    );
  }

  return (
    <TutorPageShell
      title={student.name}
      subtitle="Личный кабинет"
      badge="Для родителей"
    >
      <StudentCabinet student={student} token={token} />
    </TutorPageShell>
  );
}
