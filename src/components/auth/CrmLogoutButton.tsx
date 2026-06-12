'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CrmAccessRole } from '@/lib/auth/crm-access/constants';
import { CRM_LOGIN_PATH } from '@/lib/auth/crm-access/constants';

interface CrmLogoutButtonProps {
  role: CrmAccessRole;
}

export function CrmLogoutButton({ role }: CrmLogoutButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await fetch('/api/auth/crm-logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
    } finally {
      const nextPath = role === 'assistant' ? '/assistant' : '/admin';
      router.replace(`${CRM_LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSubmitting ? 'Выход…' : 'Выйти'}
    </button>
  );
}
