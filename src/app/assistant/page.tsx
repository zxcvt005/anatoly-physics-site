import type { Metadata } from 'next';
import { CrmLogoutButton } from '@/components/auth/CrmLogoutButton';
import { AssistantSchedule } from '@/components/tutor/AssistantSchedule';
import { TutorPageShell } from '@/components/tutor/TutorPageShell';
import { WEEKDAY_LABELS } from '@/lib/tutor-calculations';

export const metadata: Metadata = {
  title: 'Ассистент — Расписание',
  robots: { index: false, follow: false },
};

export default function AssistantPage() {
  const today = new Date();
  const todayLabel = WEEKDAY_LABELS[today.getDay()];

  return (
    <TutorPageShell
      title="Панель ассистента"
      subtitle={`${todayLabel}, ${today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      badge="Диспетчерский экран"
      actions={<CrmLogoutButton role="assistant" />}
    >
      <AssistantSchedule />
    </TutorPageShell>
  );
}
