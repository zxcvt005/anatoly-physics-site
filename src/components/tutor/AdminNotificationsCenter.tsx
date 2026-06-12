'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Plus, X } from 'lucide-react';
import { AdminAddPaymentModal } from '@/components/tutor/AdminAddPaymentModal';
import {
  formatDateTime,
  formatMoney,
  getPaymentLessonsEstimate,
  pluralizeLessons,
} from '@/lib/tutor-calculations';
import { usePayments } from '@/providers/PaymentsProvider';
import { useStudents } from '@/providers/StudentsProvider';
import type { Payment, Student } from '@/types/tutor';

interface AdminNotificationsCenterProps {
  studentsById: Map<string, Student>;
}

export function AdminNotificationsCenter({
  studentsById,
}: AdminNotificationsCenterProps) {
  const { pendingPayments, pendingCount, confirmPayment, rejectPayment, addPayment } =
    usePayments();
  const { students } = useStudents();
  const [open, setOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#3166F0]/50 hover:text-white"
        aria-label={`Оплаты${pendingCount > 0 ? `, ${pendingCount} ожидают подтверждения` : ''}`}
      >
        <Bell className="h-4 w-4 text-[#6B93FF]" />
        <span>Оплаты</span>
        {pendingCount > 0 && (
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#3166F0] px-1.5 py-0.5 text-xs font-semibold text-white">
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
            aria-label="Закрыть раздел оплат"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-notifications-title"
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2
                  id="admin-notifications-title"
                  className="text-lg font-semibold text-white"
                >
                  Оплаты
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Заявки на оплату
                  {pendingCount > 0 && (
                    <span className="ml-1.5 text-[#6B93FF]">{pendingCount}</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-zinc-800 px-5 py-3">
              <button
                type="button"
                onClick={() => setPaymentFormOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#3166F0]/40 bg-[#3166F0]/10 px-4 py-2.5 text-sm font-medium text-[#6B93FF] transition hover:border-[#3166F0]/60 hover:bg-[#3166F0]/20 hover:text-white"
              >
                <Plus className="h-4 w-4" />
                Добавить оплату
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {pendingPayments.length === 0 ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center">
                  <Bell className="mb-3 h-8 w-8 text-zinc-600" />
                  <p className="text-sm text-zinc-500">Нет заявок на оплату</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {pendingPayments.map((payment) => (
                    <PaymentNotificationCard
                      key={payment.id}
                      payment={payment}
                      student={studentsById.get(payment.studentId)}
                      onConfirm={() => confirmPayment(payment.id)}
                      onReject={() => rejectPayment(payment.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}

      <AdminAddPaymentModal
        open={paymentFormOpen}
        students={students}
        onClose={() => setPaymentFormOpen(false)}
        onSubmit={addPayment}
      />
    </>
  );
}

function PaymentNotificationCard({
  payment,
  student,
  onConfirm,
  onReject,
}: {
  payment: Payment;
  student?: Student;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const lessonsEstimate = student
    ? getPaymentLessonsEstimate(payment.amount, student.ratePerLesson)
    : 0;

  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-white">
            {student?.name ?? 'Неизвестный ученик'}
          </p>
          <p className="mt-1 text-xl font-bold text-[#3166F0]">
            {formatMoney(payment.amount)}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
          Ожидает
        </span>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex gap-2 text-zinc-400">
          <dt className="shrink-0 text-zinc-500">Дата</dt>
          <dd>{formatDateTime(payment.createdAt)}</dd>
        </div>
        {payment.note && (
          <div className="flex gap-2 text-zinc-400">
            <dt className="shrink-0 text-zinc-500">Комментарий</dt>
            <dd className="min-w-0">{payment.note}</dd>
          </div>
        )}
        {student && lessonsEstimate > 0 && (
          <div className="flex gap-2 text-zinc-400">
            <dt className="shrink-0 text-zinc-500">Примерно</dt>
            <dd>на {pluralizeLessons(lessonsEstimate)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Подтвердить
        </button>
        <button
          type="button"
          onClick={onReject}
          className="rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
        >
          Отклонить
        </button>
        {student && (
          <Link
            href={`/student/${student.token}`}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:text-white"
          >
            Ученик →
          </Link>
        )}
      </div>
    </li>
  );
}
