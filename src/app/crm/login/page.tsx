import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CrmLoginForm } from '@/components/auth/CrmLoginForm';

export const metadata: Metadata = {
  title: 'Вход в CRM',
  robots: { index: false, follow: false },
};

export default function CrmLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
          Загрузка…
        </div>
      }
    >
      <CrmLoginForm />
    </Suspense>
  );
}
