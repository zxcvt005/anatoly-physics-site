'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Wallet, X } from 'lucide-react';
import { AdminExpenseFormModal } from '@/components/tutor/AdminExpenseFormModal';
import {
  createExpenseInApi,
  deleteExpenseInApi,
  fetchExpensesBundleFromApi,
  updateExpenseInApi,
} from '@/lib/crm/api/expenses';
import {
  buildExpenseMonthGroups,
  buildTypeTotals,
  filterExpensesByType,
  formatExpenseDayMonth,
  formatExpensePeriod,
  summarizeExpenses,
  type ExpenseMonthGroup,
} from '@/lib/expenses/calculations';
import {
  EXPENSE_TYPE_DEFINITIONS,
  getExpenseTypeDefinition,
  getExpenseTypeLabel,
} from '@/lib/expenses/definitions';
import type { Expense, ExpenseInput, ExpenseStats } from '@/lib/expenses/types';
import { formatMoney } from '@/lib/tutor-calculations';
import { useStudents } from '@/providers/StudentsProvider';
import type { Student } from '@/types/tutor';

export function AdminExpensesCenter() {
  const { students } = useStudents();
  const [open, setOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const close = useCallback(() => {
    if (formOpen || deleteTarget) return;
    setOpen(false);
  }, [formOpen, deleteTarget]);

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

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadError(null);
    if (expenses === null) setLoading(true);

    void fetchExpensesBundleFromApi().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setExpenses(result.data.expenses);
      setStats(result.data.stats);
    });

    return () => {
      cancelled = true;
    };
    // Загружаем только при открытии и по кнопке «Повторить», а не после каждой записи.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reloadKey]);

  const studentsById = useMemo(() => {
    const map = new Map<string, Student>();
    for (const student of students) map.set(student.id, student);
    return map;
  }, [students]);

  const monthGroups = useMemo(
    () => buildExpenseMonthGroups(expenses ?? []),
    [expenses],
  );

  const handleSubmit = async (input: ExpenseInput) => {
    const result = editing
      ? await updateExpenseInApi(editing.id, input)
      : await createExpenseInApi(input);

    if (!result.ok) return result;
    if (result.data.expense) {
      setExpenses((current) =>
        upsertExpense(current ?? [], result.data.expense as Expense),
      );
    }
    setStats(result.data.stats);
    return { ok: true as const };
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteExpenseInApi(deleteTarget.id);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }
    const removedId = deleteTarget.id;
    setExpenses((current) => (current ?? []).filter((item) => item.id !== removedId));
    setStats(result.data.stats);
    setDeleteTarget(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (expenses === null) setLoading(true);
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#3166F0]/50 hover:text-white"
      >
        <Wallet className="h-4 w-4 text-[#6B93FF]" />
        <span>Расходы</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center p-3 sm:p-4 md:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
            aria-label="Закрыть расходы"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-expenses-title"
            className="relative z-10 flex h-full w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 sm:px-6">
              <div>
                <h2 id="admin-expenses-title" className="text-xl font-semibold text-white">
                  Расходы
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Планшеты, подарки, Профи, зарплаты и прочие траты
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {loading && expenses === null ? (
                <p className="rounded-2xl border border-zinc-800 px-5 py-10 text-center text-sm text-zinc-500">
                  Загрузка расходов…
                </p>
              ) : (
                <div className="flex flex-col gap-6 xl:flex-row">
                  <aside className="order-1 xl:order-2 xl:w-72 xl:shrink-0">
                    <ExpenseSummary stats={stats} />
                  </aside>

                  <div className="order-2 min-w-0 flex-1 space-y-6 xl:order-1">
                    {loadError && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                        <p>{loadError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (expenses === null) setLoading(true);
                            setReloadKey((value) => value + 1);
                          }}
                          className="rounded-lg border border-red-800 px-3 py-1.5 text-xs text-red-200 transition hover:bg-red-950"
                        >
                          Повторить
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-white">
                        Расходы по месяцам
                      </h3>
                      <AddExpenseButton
                        onClick={() => {
                          setEditing(null);
                          setFormOpen(true);
                        }}
                      />
                    </div>

                    {loadError && expenses === null ? null : monthGroups.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center">
                        <p className="text-sm text-zinc-500">Расходов пока нет</p>
                        <div className="mt-4 flex justify-center">
                          <AddExpenseButton
                            onClick={() => {
                              setEditing(null);
                              setFormOpen(true);
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {monthGroups.map((group, index) => (
                          <ExpenseMonthPanel
                            key={group.monthKey}
                            group={group}
                            defaultExpanded={index === 0}
                            studentsById={studentsById}
                            onEdit={(expense) => {
                              setEditing(expense);
                              setFormOpen(true);
                            }}
                            onDelete={(expense) => {
                              setDeleteError(null);
                              setDeleteTarget(expense);
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <GiftCountsPanel gifts={stats?.gifts ?? []} />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <AdminExpenseFormModal
        open={formOpen}
        expense={editing}
        students={students}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!deleting) setDeleteTarget(null);
            }}
            aria-label="Закрыть"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-white">Удалить расход?</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {getExpenseTypeLabel(deleteTarget.type)} · {formatMoney(deleteTarget.amount)}
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              Запись будет удалена. Это действие нельзя отменить.
            </p>
            {deleteError && <p className="mt-3 text-sm text-red-400">{deleteError}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {deleting ? 'Удаление…' : 'Удалить'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 transition hover:text-white disabled:opacity-60"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function upsertExpense(expenses: Expense[], expense: Expense): Expense[] {
  const exists = expenses.some((item) => item.id === expense.id);
  if (!exists) return [expense, ...expenses];
  return expenses.map((item) => (item.id === expense.id ? expense : item));
}

function AddExpenseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl bg-[#3166F0] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#2856d4]"
    >
      + Добавить расход
    </button>
  );
}

function ExpenseSummary({ stats }: { stats: ExpenseStats | null }) {
  const totals = buildTypeTotals(stats?.byType ?? {});

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 xl:sticky xl:top-0">
      <h3 className="text-sm font-semibold text-white">Сводка</h3>
      <p className="mt-0.5 text-xs text-zinc-500">Все расходы</p>
      <dl className="mt-4 space-y-2">
        {totals.map((item) => (
          <div key={item.type} className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-zinc-400">{item.pluralLabel}</dt>
            <dd className="text-sm font-medium text-white">{formatMoney(item.total)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 border-t border-zinc-800 pt-2">
          <dt className="text-sm font-medium text-zinc-200">Всего расходов</dt>
          <dd className="text-sm font-semibold text-[#6B93FF]">
            {formatMoney(stats?.total ?? 0)}
          </dd>
        </div>
        <div className="pt-2">
          <dt className="text-xs text-zinc-500">Средний расход на ученика</dt>
          <dd className="mt-1 text-lg font-semibold text-white">
            {formatMoney(stats?.averagePerStudent ?? 0)}
          </dd>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">
            Все расходы, включая Профи и зарплаты, на {stats?.studentCount ?? 0}{' '}
            {studentCountLabel(stats?.studentCount ?? 0)}
          </p>
        </div>
      </dl>
    </div>
  );
}

function studentCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'ученика';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'ученика';
  }
  return 'учеников';
}

function ExpenseMonthPanel({
  group,
  defaultExpanded,
  studentsById,
  onEdit,
  onDelete,
}: {
  group: ExpenseMonthGroup;
  defaultExpanded: boolean;
  studentsById: Map<string, Student>;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [typeFilter, setTypeFilter] = useState('all');
  const visibleExpenses = filterExpensesByType(group.expenses, typeFilter);
  const visibleSummary = summarizeExpenses(visibleExpenses);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <p className="font-medium text-white">{group.label}</p>
        <span className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#6B93FF]">
            {formatMoney(visibleSummary.total)}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-zinc-500 transition ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              Тип
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#3166F0] focus:ring-1 focus:ring-[#3166F0]"
              >
                <option value="all">Все типы</option>
                {EXPENSE_TYPE_DEFINITIONS.map((definition) => (
                  <option key={definition.type} value={definition.type}>
                    {definition.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {visibleExpenses.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-500">
              В этом месяце нет расходов выбранного типа
            </p>
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-2.5 font-medium">Дата</th>
                  <th className="px-3 py-2.5 font-medium">Тип</th>
                  <th className="px-3 py-2.5 font-medium">Ученик</th>
                  <th className="px-3 py-2.5 font-medium">Сотрудник</th>
                  <th className="px-3 py-2.5 font-medium">Период</th>
                  <th className="px-3 py-2.5 font-medium">Описание</th>
                  <th className="px-3 py-2.5 font-medium">Сумма</th>
                  <th className="px-4 py-2.5 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {visibleExpenses.map((expense) => {
                  const student = expense.studentId
                    ? studentsById.get(expense.studentId)
                    : undefined;
                  const usesPeriod = getExpenseTypeDefinition(expense.type)?.usesPeriod ?? false;
                  const date = usesPeriod ? expense.periodStart : expense.expenseDate;

                  return (
                    <tr key={expense.id} className="border-b border-zinc-800/80 last:border-b-0">
                      <td className="px-4 py-3 text-zinc-300">
                        {formatExpenseDayMonth(date)}
                      </td>
                      <td className="px-3 py-3 text-white">
                        {getExpenseTypeLabel(expense.type)}
                      </td>
                      <td className="px-3 py-3 text-zinc-300">
                        {expense.studentId ? (student?.name ?? 'Неизвестный ученик') : '—'}
                      </td>
                      <td className="px-3 py-3 text-zinc-300">
                        {expense.employeeName?.trim() || '—'}
                      </td>
                      <td className="px-3 py-3 text-zinc-400">
                        {expense.periodStart
                          ? formatExpensePeriod(expense.periodStart, expense.periodEnd)
                          : '—'}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-3 text-zinc-400">
                        {expense.description?.trim() || '—'}
                      </td>
                      <td className="px-3 py-3 font-medium text-[#6B93FF]">
                        {formatMoney(expense.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(expense)}
                            className="text-xs text-zinc-300 transition hover:text-white"
                          >
                            Редактировать
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(expense)}
                            className="text-xs text-red-400 transition hover:text-red-300"
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          <div className="border-t border-zinc-800 px-4 py-4">
            <p className="text-sm text-zinc-300">
              Итого расходов за месяц:{' '}
              <span className="font-semibold text-white">{formatMoney(visibleSummary.total)}</span>
            </p>
            <dl className="mt-3 max-w-sm space-y-1.5">
              {visibleSummary.byType.map((item) => (
                <div key={item.type} className="flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-zinc-400">{item.pluralLabel}</dt>
                  <dd className="text-sm text-zinc-200">{formatMoney(item.total)}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 border-t border-zinc-800 pt-1.5">
                <dt className="text-sm font-medium text-white">Итого</dt>
                <dd className="text-sm font-semibold text-white">
                  {formatMoney(visibleSummary.total)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function GiftCountsPanel({
  gifts,
}: {
  gifts: ExpenseStats['gifts'];
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="border-b border-zinc-800 px-4 py-4 sm:px-5">
        <h3 className="text-base font-semibold text-white">Подарки ученикам</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          Считается по записям типа «Подарок»
        </p>
      </div>

      {gifts.length === 0 ? (
        <p className="px-4 py-6 text-sm text-zinc-500 sm:px-5">Подарков пока нет</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2.5 font-medium sm:px-5">Ученик</th>
                <th className="px-4 py-2.5 text-right font-medium sm:px-5">Подарков</th>
              </tr>
            </thead>
            <tbody>
              {gifts.map((gift) => (
                <tr key={gift.studentId} className="border-b border-zinc-800/80 last:border-b-0">
                  <td className="px-4 py-3 text-white sm:px-5">
                    {gift.studentName || 'Неизвестный ученик'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-zinc-200 sm:px-5">
                    {gift.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
