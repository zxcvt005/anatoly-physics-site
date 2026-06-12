'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { formatMoney } from '@/lib/tutor-calculations';
import type { AddPaymentInput } from '@/providers/PaymentsProvider';
import type { PaymentStatus, Student } from '@/types/tutor';

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'confirmed', label: 'Подтверждена' },
  { value: 'pending', label: 'Ожидает подтверждения' },
  { value: 'rejected', label: 'Отклонена' },
];

interface AdminAddPaymentModalProps {
  open: boolean;
  students: Student[];
  defaultStudentId?: string;
  onClose: () => void;
  onSubmit: (input: AddPaymentInput) => void;
}

export function AdminAddPaymentModal({
  open,
  students,
  defaultStudentId,
  onClose,
  onSubmit,
}: AdminAddPaymentModalProps) {
  const [studentId, setStudentId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('confirmed');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      student.name.toLowerCase().includes(query),
    );
  }, [students, studentQuery]);

  const selectedStudent = students.find((student) => student.id === studentId);

  useEffect(() => {
    if (!open) return;

    const today = new Date().toISOString().slice(0, 10);
    setStudentId(defaultStudentId ?? '');
    setStudentQuery('');
    setDropdownOpen(false);
    setAmount('');
    setPaymentDate(today);
    setNote('');
    setStatus('confirmed');
  }, [open, defaultStudentId]);

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

  const parsedAmount = Number(amount.replace(/\s/g, ''));
  const canSubmit = Boolean(
    studentId && paymentDate && parsedAmount > 0,
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      studentId,
      amount: parsedAmount,
      status,
      paymentDate,
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Закрыть"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-add-payment-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2
            id="admin-add-payment-title"
            className="text-lg font-semibold text-white"
          >
            Добавить оплату
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
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
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
              autoComplete="off"
            />
            {dropdownOpen && filteredStudents.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                {filteredStudents.map((student) => (
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
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Сумма, ₽
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value.replace(/\D/g, ''))
              }
              placeholder="10000"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            />
            {selectedStudent && selectedStudent.ratePerLesson > 0 && (
              <p className="mt-1.5 text-xs text-zinc-500">
                1 занятие — {formatMoney(selectedStudent.ratePerLesson)}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Дата оплаты
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Комментарий
            </label>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Например: перевод на карту"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-zinc-300">
              Статус
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                    status === option.value
                      ? 'border-[#3166F0]/50 bg-[#3166F0]/10 text-white'
                      : 'border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-status"
                    value={option.value}
                    checked={status === option.value}
                    onChange={() => setStatus(option.value)}
                    className="accent-[#3166F0]"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-xl bg-[#3166F0] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#2856d4] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 transition hover:text-white"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
