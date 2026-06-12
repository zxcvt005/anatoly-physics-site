import { redirect } from 'next/navigation';
import { AssistantClientLayout } from '@/app/assistant/AssistantClientLayout';
import { CRM_LOGIN_PATH } from '@/lib/auth/crm-access/constants';
import { canAccessAssistantAreaServer } from '@/lib/auth/crm-access/guard.server';

export default async function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await canAccessAssistantAreaServer())) {
    redirect(`${CRM_LOGIN_PATH}?next=/assistant`);
  }

  return <AssistantClientLayout>{children}</AssistantClientLayout>;
}
