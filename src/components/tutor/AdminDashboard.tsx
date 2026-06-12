'use client';

import { CrmLogoutButton } from '@/components/auth/CrmLogoutButton';
import { AdminExportReportButton } from '@/components/tutor/AdminExportReportButton';
import { AdminHeaderActions } from '@/components/tutor/AdminHeaderActions';
import { AdminSchedulePanel } from '@/components/tutor/AdminSchedulePanel';
import { TutorPageShell } from '@/components/tutor/TutorPageShell';

export function AdminDashboard() {
  return (
    <TutorPageShell
      title="Админка репетитора"
      subtitle="Расписание, ученики, заявки на оплату"
      badge="CRM"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <AdminExportReportButton />
          <CrmLogoutButton role="admin" />
          <AdminHeaderActions />
        </div>
      }
    >
      <AdminSchedulePanel />
    </TutorPageShell>
  );
}
