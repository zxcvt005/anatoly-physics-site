'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { EXPENSE_TYPE_DEFINITIONS } from '@/lib/expenses/definitions';
import type { Expense, ExpenseInput, ExpenseType } from '@/lib/expenses/types';
import { validateExpenseInput } from '@/lib/expenses/validation';
import { getMoscowDateKey } from '@/lib/lesson-datetime';
import type { Student } from '@/types/tutor';

const FIELD_CLASS =
  'w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]';

type AdminExpenseFormModalProps = {
  open: boolean;
  expense: Expense | null;
  students: Student[];
  onClose: () => void;
  onSubmit: (
    input: ExpenseInput,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function AdminExpenseFormModal({
  open,
  expense,
  students,
  onClose,
  onSubmit,
}: AdminExpenseFormModalProps) {
  const [type, setType] = useState<ExpenseType>('tablet');
  const [studentId, setStudentId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [description, setDescription] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const definition = EXPENSE_TYPE_DEFINITIONS.find((item) => item.type === type)
    ?? EXPENSE_TYPE_DEFINITIONS[0]!;

  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return sortedStudents;
    return sortedStudents.filter((student) =>
      student.name.toLowerCase().includes(query),
    );
  }, [sortedStudents, studentQuery]);

  const selectedStudent = sortedStudents.find((student) => student.id === studentId);

  useEffect(() => {
    if (!open) return;

    const today = getMoscowDateKey();
    const initialType = EXPENSE_TYPE_DEFINITIONS.some(
      (item) => item.type === expense?.type,
    )
      ? (expense?.type as ExpenseType)
      : 'tablet';

    setType(initialType);
    setStudentId(expense?.studentId ?? '');
    setStudentQuery('');
    setDropdownOpen(false);
    setAmount(expense ? String(expense.amount) : '');
    setExpenseDate(expense?.expenseDate ?? today);
    setPeriodStart(expense?.periodStart ?? today);
    setPeriodEnd(expense?.periodEnd ?? today);
    setDescription(expense?.description ?? '');
    setEmployeeName(expense?.employeeName ?? '');
    setError(null);
    setSaving(false);
  }, [open, expense]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, saving]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  if (!open) return null;

  const parsedAmount = Number(amount);
  const input: ExpenseInput = {
    type,
    studentId: definition.requiresStudent ? studentId : null,
    amount: parsedAmount,
    expenseDate: definition.usesPeriod ? null : expenseDate,
    periodStart: definition.usesPeriod ? periodStart : null,
    periodEnd: definition.usesPeriod ? periodEnd : null,
    description: definition.requiresDescription ? description : null,
    employeeName: definition.requiresEmployee ? employeeName : null,
  };
  const canSubmit = validateExpenseInput(input).ok && !saving;

  const handleTypeChange = (next: ExpenseType) => {
    setType(next);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validated = validateExpenseInput(input);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setSaving(true);
    setError(null);
    const result = await onSubmit(validated.value);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-label="Закрыть"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-expense-form-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 id="admin-expense-form-title" className="text-lg font-semibold text-white">
            {expense ? 'Редактировать расход' : 'Добавить расход'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:opacity-40"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4 p-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-zinc-300">Тип</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EXPENSE_TYPE_DEFINITIONS.map((item) => (
                <label
                  key={item.type}
                  className={`flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2.5 text-sm transition ${
                    type === item.type
                      ? 'border-[#3166F0]/50 bg-[#3166F0]/10 text-white'
                      : 'border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="expense-type"
                    value={item.type}
                    checked={type === item.type}
                    onChange={() => handleTypeChange(item.type)}
                    className="sr-only"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>

          {definition.requiresEmployee && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Сотрудник
              </label>
              <input
                type="text"
                value={employeeName}
                onChange={(event) => setEmployeeName(event.target.value)}
                placeholder="Например: Дима"
                className={FIELD_CLASS}
              />
            </div>
          )}

          {definition.requiresStudent && (
            <div ref={dropdownRef} className="relative">
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Ученик
              </label>
              <input
                type="text"
                value={
                  dropdownOpen || !selectedStudent
                    ? studentQuery
                    : selectedStudent.name
                }
                onChange={(event) => {
                  setStudentQuery(event.target.value);
                  setStudentId('');
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Начните вводить имя…"
                className={FIELD_CLASS}
                autoComplete="off"
              />
              {dropdownOpen && (
                <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                  {filteredStudents.length === 0 ? (
                    <li className="px-3.5 py-2 text-sm text-zinc-500">
                      Ученики не найдены
                    </li>
                  ) : (
                    filteredStudents.map((student) => (
                      <li key={student.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setStudentId(student.id);
                            setStudentQuery(student.name);
                            setDropdownOpen(false);
                          }}
                          className="w-full px-3.5 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                        >
                          {student.name}
                          <span className="ml-2 text-zinc-500">
                            {student.gradeClass} класс
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}

          {definition.usesPeriod ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Период: начало
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(event) => setPeriodStart(event.target.value)}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Период: окончание
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(event) => setPeriodEnd(event.target.value)}
                  className={FIELD_CLASS}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Дата
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                className={FIELD_CLASS}
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Сумма, ₽
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))}
              placeholder="3000"
              className={FIELD_CLASS}
            />
          </div>

          {definition.requiresDescription && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Описание
              </label>
              <input
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Например: дополнительные материалы"
                className={FIELD_CLASS}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-xl bg-[#3166F0] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#2856d4] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 transition hover:text-white disabled:opacity-40"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
