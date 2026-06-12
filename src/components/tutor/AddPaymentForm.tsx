'use client';

import { useState } from 'react';
import { CollapsiblePanel } from '@/components/tutor/CollapsiblePanel';
import { formatMoney } from '@/lib/tutor-calculations';
import { usePayments } from '@/providers/PaymentsProvider';

interface AddPaymentFormProps {
  studentId: string;
  studentName: string;
  amountPresets?: number[];
}

export function AddPaymentForm({
  studentId,
  studentName,
  amountPresets = [],
}: AddPaymentFormProps) {
  const { addPendingPayment } = usePayments();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount);

    if (!parsed || parsed <= 0) {
      alert('Введите корректную сумму');
      return;
    }

    addPendingPayment({
      studentId,
      amount: parsed,
      note: note.trim() || undefined,
    });

    setAmount('');
    setNote('');
    setIsOpen(false);
  };

  const handleAmountChange = (value: string) => {
    setAmount(value.replace(/\D/g, ''));
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3166F0] px-6 py-4 text-base font-semibold text-white shadow-[0_0_32px_rgba(49,102,240,0.35)] transition hover:scale-[1.01] hover:bg-[#2858d4]"
      >
        <span className="text-xl leading-none">+</span>
        Сообщить об оплате
      </button>

      <CollapsiblePanel open={isOpen}>
        <form
          onSubmit={handleSubmit}
          className="mt-3 rounded-2xl border border-zinc-700 bg-zinc-900/80 p-5"
        >
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Сумма оплаты, ₽
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="10000"
            className="mb-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-[#3166F0]"
            autoFocus={isOpen}
          />

          {amountPresets.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {amountPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-500 hover:text-white xl:text-sm"
                >
                  {formatMoney(preset)}
                </button>
              ))}
            </div>
          )}

          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Комментарий
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Например: перевод на карту"
            className="mb-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-[#3166F0]"
          />

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              Отправить
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setAmount('');
                setNote('');
              }}
              className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-400 transition hover:text-white"
            >
              Отмена
            </button>
          </div>
        </form>
      </CollapsiblePanel>
    </div>
  );
}
