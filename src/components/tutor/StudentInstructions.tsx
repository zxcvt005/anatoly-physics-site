'use client';

import { ChevronDown, Info } from 'lucide-react';
import { useState } from 'react';
import { CollapsiblePanel } from '@/components/tutor/CollapsiblePanel';

const instructions = [
  'В календаре отмечены прошедшие и будущие занятия.',
  'Зелёным отмечены уже проведённые занятия.',
  'Синим отмечены будущие занятия, которые покрыты оплатой.',
  'Жёлтым отмечена оплата, которая ожидает подтверждения преподавателем.',
  'Красным отмечены занятия, для которых требуется оплата.',
  'Чтобы сообщить об оплате, нажмите кнопку «Сообщить об оплате».',
  'После проверки преподавателем оплата автоматически появится на странице.',
  'Если заметили ошибку в данных, напишите преподавателю.',
];

export function StudentInstructions() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`rounded-2xl border bg-[#3166F0]/[0.07] shadow-[0_0_24px_rgba(49,102,240,0.08)] transition-colors duration-300 ${
        isOpen
          ? 'border-[#3166F0]/50'
          : 'border-[#3166F0]/35'
      }`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-white">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#3166F0]/40 bg-[#3166F0]/15">
            <Info className="h-4 w-4 text-[#6B93FF]" aria-hidden />
          </span>
          Как пользоваться страницей?
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#6B93FF] transition-transform duration-300 ease-in-out ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      <CollapsiblePanel open={isOpen}>
        <ul className="space-y-2 border-t border-[#3166F0]/20 px-4 py-3 text-sm leading-relaxed text-zinc-300">
          {instructions.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#3166F0]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CollapsiblePanel>
    </div>
  );
}
