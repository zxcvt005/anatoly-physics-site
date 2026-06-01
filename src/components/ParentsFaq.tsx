'use client';

import { memo, useState } from 'react';

const parentsFaq = [
  {
    question: 'С каким уровнем учеников вы работаете?',
    answer:
      'Подготовка строится индивидуально. Для одних основной задачей становится устранение пробелов, для других — работа над сложными задачами и повышение результата до максимально возможного уровня. Я подбираю программу под конкретный запрос ученика.',
  },
  {
    question:
      'Можно ли подготовиться на высокий балл, если сейчас есть серьёзные пробелы?',
    answer:
      'Да. На практике большинство учеников приходят далеко не с идеальной базой. Подготовка начинается с определения текущего уровня и постепенного закрытия пробелов. Главное не то, сколько ученик знает сейчас, а насколько системно он готов работать дальше. Со своей стороны я сделаю всё, чтобы этот путь был максимально понятным и планомерным.',
  },
  {
    question: 'Что отличает ваши занятия от другого репетитора?',
    answer:
      'Моя задача не просто объяснить тему. Я строю чёткую систему подготовки, в которой ученик понимает, что делает, зачем делает и как это влияет на будущий результат. Кроме того, я создаю увлекательную атмосферу, которая помогает готовиться с энергией и стремлением к высоким баллам.',
  },
  {
    question: 'Если ученик стесняется задавать вопросы, это проблема?',
    answer:
      'Нет. Многие ученики сначала боятся ошибаться или показаться недостаточно подготовленными. На занятиях я создаю спокойную рабочую атмосферу, в которой ученик чувствует себя уверенно, понимает, что его никто не осудит и обязательно поддержит.',
  },
  {
    question: 'Сколько времени обычно занимает подготовка?',
    answer:
      'Всё зависит от текущего уровня и цели ученика. После пробного урока становится понятно, какой объём работы потребуется и какой формат подготовки будет наиболее эффективным.',
  },
  {
    question: 'Можно ли контролировать процесс подготовки?',
    answer:
      'В процессе подготовки я регулярно делюсь с родителями обратной связью, рассказываю о прогрессе ученика и обращаю внимание на моменты, которые требуют дополнительной работы. Кроме того, результат подготовки всегда можно увидеть по выполненным домашним заданиям, пробным экзаменам и общему уровню уверенности ученика в решении задач.',
  },
];

export const ParentsFaq = memo(function ParentsFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="parents" className="scroll-mt-20 px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-10 text-center text-4xl font-bold md:text-5xl">
          Для родителей
        </h2>

        <div className="space-y-3">
          {parentsFaq.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={item.question}
                className={`overflow-hidden rounded-3xl border bg-zinc-950 shadow-lg transition-colors duration-300 ${
                  isOpen
                    ? 'border-[#3166F0] shadow-[0_0_32px_rgba(49,102,240,0.12)]'
                    : 'border-zinc-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left md:px-8 md:py-6"
                  aria-expanded={isOpen}
                >
                  <h3
                    className={`text-lg font-semibold leading-snug transition-colors duration-300 md:text-xl ${
                      isOpen ? 'text-[#3166F0]' : 'text-white'
                    }`}
                  >
                    {item.question}
                  </h3>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-lg transition-all duration-300 ${
                      isOpen
                        ? 'rotate-45 border-[#3166F0]/40 bg-[#3166F0]/10 text-[#3166F0]'
                        : 'border-zinc-700 text-zinc-400'
                    }`}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="border-t border-zinc-800/80 px-6 pb-6 pt-4 leading-8 text-zinc-400 md:px-8 md:pb-7">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
