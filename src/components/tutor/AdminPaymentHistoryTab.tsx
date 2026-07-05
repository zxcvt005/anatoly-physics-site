'use client';

import { useMemo } from 'react';
import {
  buildPaymentHistoryGroups,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
} from '@/lib/payment-history';
import { formatDateTime, formatMoney } from '@/lib/tutor-calculations';
import { usePayments } from '@/providers/PaymentsProvider';
import type { Payment, PaymentStatus, Student } from '@/types/tutor';

interface AdminPaymentHistoryTabProps {
  studentsById: Map<string, Student>;
}

export function AdminPaymentHistoryTab({
  studentsById,
}: AdminPaymentHistoryTabProps) {
  const { payments, updatePaymentStatus, setPaymentTaxAccounted } = usePayments();

  const monthGroups = useMemo(
    () => buildPaymentHistoryGroups(payments),
    [payments],
  );

  if (monthGroups.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center text-sm text-zinc-500">
        Оплат пока нет
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {monthGroups.map((group) => (
        <section
          key={group.monthKey}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40"
        >
          <div className="border-b border-zinc-800 px-4 py-4 sm:px-5">
            <h3 className="text-base font-semibold text-white">{group.label}</h3>
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
              <div>
                <span className="text-zinc-500">Подтверждено: </span>
                <span className="font-medium text-[#6B93FF]">
                  {formatMoney(group.summary.confirmed)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Ожидает: </span>
                <span className="font-medium text-amber-300">
                  {formatMoney(group.summary.pending)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Отклонено: </span>
                <span className="font-medium text-zinc-300">
                  {formatMoney(group.summary.rejected)}
                </span>
              </div>
            </dl>
          </div>

          <ul className="divide-y divide-zinc-800">
            {group.payments.map((payment) => (
              <PaymentHistoryRow
                key={payment.id}
                payment={payment}
                student={studentsById.get(payment.studentId)}
                onStatusChange={updatePaymentStatus}
                onTaxAccountedChange={setPaymentTaxAccounted}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PaymentHistoryRow({
  payment,
  student,
  onStatusChange,
  onTaxAccountedChange,
}: {
  payment: Payment;
  student?: Student;
  onStatusChange: (paymentId: string, status: PaymentStatus) => void;
  onTaxAccountedChange: (paymentId: string, taxAccounted: boolean) => void;
}) {
  const taxAccounted = Boolean(payment.taxAccounted);

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">
          {student?.name ?? 'Неизвестный ученик'}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {formatDateTime(payment.createdAt)}
        </p>
        <p className="mt-2 text-lg font-bold text-[#6B93FF]">
          {formatMoney(payment.amount)}
        </p>
        {payment.note && (
          <p className="mt-1 text-sm text-zinc-400">{payment.note}</p>
        )}
        {taxAccounted && (
          <p className="mt-1 text-xs text-emerald-400/90">Учтено в налогах</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-3 sm:min-w-[220px]">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Статус
          </span>
          <select
            value={payment.status}
            onChange={(event) =>
              onStatusChange(payment.id, event.target.value as PaymentStatus)
            }
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#3166F0] focus:ring-1 focus:ring-[#3166F0]"
          >
            {PAYMENT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {PAYMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={taxAccounted}
            onChange={(event) =>
              onTaxAccountedChange(payment.id, event.target.checked)
            }
            className="accent-[#3166F0]"
          />
          Учтено в налогах
        </label>
      </div>
    </li>
  );
}
