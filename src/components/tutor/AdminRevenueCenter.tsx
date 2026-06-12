'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, TrendingUp, X } from 'lucide-react';
import {
  buildMonthRevenueViews,
  buildScheduleRevenueByWeekday,
  computeCurrentMonthTaxSummary,
  computeRevenueSummaryCards,
  type MonthRevenueView,
  type SlotRevenueItem,
} from '@/lib/revenue-calculations';
import {
  formatDateTime,
  formatMoney,
  formatTimeRange,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  WEEKDAY_SHORT_LABELS,
} from '@/lib/tutor-calculations';
import { usePayments } from '@/providers/PaymentsProvider';
import { useRevenueSnapshots } from '@/providers/RevenueSnapshotsProvider';
import { useScheduleSlots } from '@/providers/ScheduleSlotsProvider';
import { useStudents } from '@/providers/StudentsProvider';
import type { Payment, Student } from '@/types/tutor';

export function AdminRevenueCenter() {
  const { students } = useStudents();
  const { payments, setPaymentTaxAccounted } = usePayments();
  const { slots } = useScheduleSlots();
  const { snapshots, freezePastMonths } = useRevenueSnapshots();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    freezePastMonths(students, payments);
  }, [freezePastMonths, students, payments]);

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

  const studentsById = useMemo(() => {
    const map = new Map<string, Student>();
    for (const student of students) {
      map.set(student.id, student);
    }
    return map;
  }, [students]);

  const summaryCards = useMemo(
    () => computeRevenueSummaryCards(students, payments, slots),
    [students, payments, slots],
  );

  const revenueByWeekday = useMemo(
    () => buildScheduleRevenueByWeekday(slots, studentsById),
    [slots, studentsById],
  );

  const monthViews = useMemo(
    () => buildMonthRevenueViews(students, payments, snapshots),
    [students, payments, snapshots],
  );

  const taxSummary = useMemo(
    () => computeCurrentMonthTaxSummary(payments),
    [payments],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#3166F0]/50 hover:text-white"
      >
        <TrendingUp className="h-4 w-4 text-[#6B93FF]" />
        <span>Доходы</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center p-3 sm:p-4 md:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
            aria-label="Закрыть доходы"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-revenue-title"
            className="relative z-10 flex h-full w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 sm:px-6">
              <div>
                <h2
                  id="admin-revenue-title"
                  className="text-xl font-semibold text-white"
                >
                  Доходы
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Потенциал из расписания и реальные поступления
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  label="Потенциальный доход месяца"
                  value={formatMoney(summaryCards.potentialMonthlyIncome)}
                />
                <SummaryCard
                  label="Получено в текущем месяце"
                  value={formatMoney(summaryCards.receivedCurrentMonth)}
                  accent
                />
                <SummaryCard
                  label="Средняя ставка за занятие"
                  value={formatMoney(summaryCards.averageLessonRate)}
                />
                <SummaryCard
                  label="Средняя ставка в час"
                  hint="с учётом наполняемости слотов"
                  value={formatMoney(summaryCards.averageHourlyRate)}
                />
              </div>

              <section className="mt-8">
                <SectionTitle
                  title="Доходы по слотам"
                  hint="Доход за одно занятие в слоте · зеркало недельного расписания"
                />
                <ScheduleRevenueWeekGrid revenueByWeekday={revenueByWeekday} />
              </section>

              <section className="mt-8">
                <SectionTitle title="Реальные доходы" />
                <div className="space-y-3">
                  {monthViews.map((month) => (
                    <MonthRevenuePanel
                      key={month.monthKey}
                      month={month}
                      studentsById={studentsById}
                      onToggleTax={setPaymentTaxAccounted}
                    />
                  ))}
                </div>
              </section>

              <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-white">
                  Учёт налогов · текущий месяц
                </h3>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <TaxStat label="Получено" value={formatMoney(taxSummary.received)} />
                  <TaxStat
                    label="Учтено в налогах"
                    value={formatMoney(taxSummary.taxAccounted)}
                    accent
                  />
                  <TaxStat
                    label="Не учтено"
                    value={formatMoney(taxSummary.notAccounted)}
                    warning={taxSummary.notAccounted > 0}
                  />
                </dl>
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function ScheduleRevenueWeekGrid({
  revenueByWeekday,
}: {
  revenueByWeekday: Map<number, SlotRevenueItem[]>;
}) {
  const hasSlots = [...revenueByWeekday.values()].some(
    (items) => items.length > 0,
  );

  if (!hasSlots) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-800 px-5 py-8 text-center text-sm text-zinc-500">
        Слотов в расписании пока нет
      </p>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto xl:block">
        <div className="min-w-[960px] rounded-2xl border border-zinc-800">
          <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-950/90">
            {WEEKDAY_ORDER.map((weekday) => (
              <div
                key={weekday}
                className="border-r border-zinc-800 px-2 py-3 text-center last:border-r-0"
              >
                <p className="text-sm font-semibold text-white">
                  {WEEKDAY_SHORT_LABELS[weekday]}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {WEEKDAY_ORDER.map((weekday) => {
              const dayItems = revenueByWeekday.get(weekday) ?? [];

              return (
                <div
                  key={weekday}
                  className="min-h-[260px] space-y-2 border-r border-zinc-800 bg-zinc-950/40 p-2 last:border-r-0"
                >
                  {dayItems.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-zinc-600">
                      —
                    </p>
                  ) : (
                    dayItems.map((item) => (
                      <SlotRevenueCard key={item.slot.id} item={item} />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4 xl:hidden">
        {WEEKDAY_ORDER.map((weekday) => {
          const dayItems = revenueByWeekday.get(weekday) ?? [];

          return (
            <div key={weekday}>
              <h4 className="mb-2 text-sm font-semibold text-white">
                {WEEKDAY_LABELS[weekday]}
              </h4>
              {dayItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-5 text-center text-xs text-zinc-600">
                  Нет занятий
                </p>
              ) : (
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <SlotRevenueCard key={item.slot.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function formatStudentCount(count: number): string {
  if (count === 0) return 'нет учеников';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} ученик`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} ученика`;
  }
  return `${count} учеников`;
}

function SlotRevenueCard({ item }: { item: SlotRevenueItem }) {
  const { slot, revenue, studentCount } = item;
  const studentLabel = formatStudentCount(studentCount);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-2.5 py-2">
      <p className="text-xs font-semibold text-[#6B93FF]">
        {formatTimeRange(slot.startTime, slot.endTime)}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">
        {formatMoney(revenue)}
        <span className="ml-1 text-[10px] font-normal text-zinc-500">
          / занятие
        </span>
      </p>
      <p className="mt-0.5 text-[10px] text-zinc-500">{studentLabel}</p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-4">
      <p className="text-xs text-zinc-500">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-zinc-600">{hint}</p>}
      <p
        className={`mt-1 text-2xl font-bold ${
          accent ? 'text-[#6B93FF]' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function MonthRevenuePanel({
  month,
  studentsById,
  onToggleTax,
}: {
  month: MonthRevenueView;
  studentsById: Map<string, Student>;
  onToggleTax: (paymentId: string, taxAccounted: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(month.isCurrentMonth);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div>
          <p className="font-medium text-white">{month.label}</p>
          <p className="mt-1 text-sm text-zinc-400">
            Получено:{' '}
            <span className="text-[#6B93FF]">
              {formatMoney(month.receivedIncome)}
            </span>
            <span className="mx-2 text-zinc-700">·</span>
            Потенциал: {formatMoney(month.potentialIncome)}
            {month.isFrozen && (
              <span className="ml-2 text-xs text-zinc-600">зафиксировано</span>
            )}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-3">
          {month.payments.length === 0 ? (
            <p className="py-2 text-sm text-zinc-500">
              Подтверждённых оплат за этот месяц нет
            </p>
          ) : (
            <ul className="space-y-2">
              {month.payments.map((payment) => (
                <PaymentTaxRow
                  key={payment.id}
                  payment={payment}
                  student={studentsById.get(payment.studentId)}
                  showTaxToggle={month.isCurrentMonth}
                  onToggleTax={onToggleTax}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentTaxRow({
  payment,
  student,
  showTaxToggle,
  onToggleTax,
}: {
  payment: Payment;
  student?: Student;
  showTaxToggle: boolean;
  onToggleTax: (paymentId: string, taxAccounted: boolean) => void;
}) {
  const taxAccounted = Boolean(payment.taxAccounted);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">
          {student?.name ?? 'Неизвестный ученик'}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {formatDateTime(payment.createdAt)}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold text-[#6B93FF]">
          {formatMoney(payment.amount)}
        </p>

        {showTaxToggle ? (
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={taxAccounted}
              onChange={(event) =>
                onToggleTax(payment.id, event.target.checked)
              }
              className="accent-[#3166F0]"
            />
            {taxAccounted ? 'Учтено в налогах' : 'Не учтено'}
          </label>
        ) : (
          <span className="text-xs text-zinc-500">
            {taxAccounted ? '☑ Учтено в налогах' : '☐ Не учтено'}
          </span>
        )}
      </div>
    </li>
  );
}

function TaxStat({
  label,
  value,
  accent,
  warning,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd
        className={`mt-1 text-lg font-semibold ${
          warning
            ? 'text-amber-300'
            : accent
              ? 'text-[#6B93FF]'
              : 'text-white'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
