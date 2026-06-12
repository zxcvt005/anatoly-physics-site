'use client';

import Link from 'next/link';
import { LessonStatusBadge } from '@/components/tutor/LessonStatusBadge';
import { formatDateTime, formatMoney } from '@/lib/tutor-calculations';
import type { Payment, Student } from '@/types/tutor';

interface AdminPaymentCardProps {
  payment: Payment;
  student?: Student;
}

export function AdminPaymentCard({ payment, student }: AdminPaymentCardProps) {
  const handleConfirm = () => {
    alert(
      `Подтверждение оплаты ${formatMoney(payment.amount)} для ${student?.name ?? 'ученика'}\n\n(Пока это демо — данные не сохраняются)`,
    );
  };

  const handleReject = () => {
    alert(
      `Отклонение оплаты ${formatMoney(payment.amount)} для ${student?.name ?? 'ученика'}\n\n(Пока это демо — данные не сохраняются)`,
    );
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">
            {student?.name ?? 'Неизвестный ученик'}
          </p>
          <p className="mt-1 text-2xl font-bold text-[#3166F0]">
            {formatMoney(payment.amount)}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {formatDateTime(payment.createdAt)}
            {payment.note ? ` · ${payment.note}` : ''}
          </p>
        </div>
        <LessonStatusBadge status="pending" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Подтвердить
        </button>
        <button
          type="button"
          onClick={handleReject}
          className="rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
        >
          Отклонить
        </button>
        {student && (
          <Link
            href={`/student/${student.token}`}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:text-white"
          >
            Страница ученика →
          </Link>
        )}
      </div>
    </div>
  );
}
