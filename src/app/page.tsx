'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProfiTrust } from '@/components/ProfiTrust';
import { SmokeBackground } from '@/components/SmokeBackground';
import { ParentsFaq } from '@/components/ParentsFaq';
import { SummerSchool } from '@/components/SummerSchool';
import { TrialStudentReview } from '@/components/TrialStudentReview';
const statCards = [
  { value: '80,4', label: 'Средний балл учеников' },
  { value: '🎯', label: 'Только ЕГЭ по физике' },
  { value: '🎁', label: 'Мотивирующая атмосфера' },
  { value: '📈', label: 'Постоянный контроль прогресса' },
];

const benefitCards = [
  {
    title: 'Понятный план подготовки',
    text: 'С первых занятий становится понятно, что нужно делать сейчас, через месяц и до самого экзамена.',
  },
  {
    title: 'Работа с уровнем ЕГЭ',
    text: 'Решаем актуальные задачи ЕГЭ, разбираем оформление, готовимся по четкой системе.',
  },
  {
    title: 'Подготовка без скуки',
    text: 'Конкурсы, рейтинги, подарки и игровые элементы помогают сохранить мотивацию на протяжении всего года.',
  },
  {
    title: 'Поддержка и обратная связь',
    text: 'Всегда можно задать вопрос, получить помощь и разобраться в сложной теме до конца.',
  },
];

const trialHighlights = [
  'Определим текущий уровень',
  'Покажу реальные точки роста',
  'Составим дорожную карту подготовки',
];

export default function Home() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="fixed inset-0 z-0 bg-black" aria-hidden />
      <SmokeBackground />
      <Navbar />
      <div className="relative z-10">
      <section id="home" className="flex min-h-screen scroll-mt-20 items-center justify-center px-6 pt-16">
        <div className="max-w-5xl text-center">
          <p className="mb-5 text-sm uppercase tracking-[0.35em] text-zinc-400">
            Репетитор по физике ЕГЭ
          </p>

          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-7xl">
            Подготовка к ЕГЭ
            <br />
            без скучной душнины
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-zinc-400 md:text-xl">
            Современная подготовка по физике с понятными объяснениями,
            системой, мемами, вовлечением и результатом 80+ баллов.
          </p>

          <button
            onClick={() => setIsContactModalOpen(true)}
            className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition hover:scale-105"
          >
            Записаться на пробный урок
          </button>
        </div>
      </section>

      <section id="about" className="relative scroll-mt-20 px-6 py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-center">
          <div className="relative mb-10 h-80 w-80 shrink-0 overflow-hidden rounded-full border-4 border-zinc-700 shadow-[0_0_56px_rgba(49,102,240,0.28)] md:h-96 md:w-96">
            <Image
              src="/anatoly-photo.jpg"
              alt="Анатолий — репетитор по физике ЕГЭ"
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 320px, 384px"
            />
          </div>

          <h2 className="mb-10 text-center text-4xl font-bold md:text-5xl">
            Обо мне
          </h2>

          <div className="w-full rounded-3xl border border-zinc-700 bg-zinc-950 p-10 shadow-xl">
            <h3 className="mb-6 text-3xl font-bold md:text-4xl">
              Привет, я Анатолий
            </h3>

            <div className="space-y-4 text-lg leading-8 text-zinc-400">
              <p>Я частный репетитор по физике ЕГЭ.</p>

              <p>
                Сам когда-то прошёл путь подготовки к экзаменам и хорошо понимаю,
                с какими трудностями сталкиваются школьники. Поэтому на занятиях
                я делаю упор не только на результат, но и на комфортную атмосферу,
                понятные объяснения и интерес к предмету.
              </p>

              <p>
                Мои ученики учатся понимать физику и решать задачи ЕГЭшного уровня,
                а не просто запоминать формулы. Мы работаем по четкой системе,
                отслеживаем прогресс и постепенно закрываем все пробелы.
              </p>

              <p className="font-semibold text-white">
                Средний результат моих учеников — около 80,4 балла.
              </p>
            </div>
          </div>

          <ProfiTrust />
        </div>
      </section>

      <SummerSchool />

      <section id="benefits" className="scroll-mt-20 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-4xl font-bold md:text-5xl">
            Преимущества
          </h2>

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-6 text-center shadow-lg"
              >
                <p
                  className={`mb-2 font-bold leading-none ${
                    stat.value === '80,4'
                      ? 'text-3xl text-[#3166F0] md:text-4xl'
                      : 'text-3xl md:text-4xl'
                  }`}
                >
                  {stat.value}
                </p>
                <p className="text-sm leading-snug text-zinc-400 md:text-base">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {benefitCards.map((card) => (
              <div
                key={card.title}
                className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl md:p-10"
              >
                <h3 className="mb-4 text-2xl font-bold md:text-3xl">
                  {card.title}
                </h3>
                <p className="text-lg leading-8 text-zinc-400">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="trial" className="scroll-mt-20 px-6 py-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950 p-10 shadow-2xl md:p-16">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#3166F0]/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#3166F0]/10 blur-3xl"
            aria-hidden
          />

          <div className="relative">
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-zinc-400">
              Пробный урок
            </p>

            <h2 className="mb-6 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
              За 45 минут станет понятно, как выйти на нужный результат
            </h2>

            <p className="mb-10 max-w-2xl text-lg leading-8 text-zinc-400">
              Никаких обязательств и пустых обещаний. Просто честно оценим
              текущий уровень, разберём сильные и слабые стороны и составим
              понятный маршрут до экзамена.
            </p>

            <div className="mb-10 grid gap-4 sm:grid-cols-3">
              {trialHighlights.map((label) => (
                <div
                  key={label}
                  className="rounded-2xl border border-zinc-800 bg-black/50 px-5 py-5 backdrop-blur-sm"
                >
                  <p className="font-semibold leading-snug text-white">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsContactModalOpen(true)}
              className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition hover:scale-105"
            >
              Записаться на пробный урок
            </button>

            <TrialStudentReview />
          </div>
        </div>
      </section>

      <ParentsFaq />

      <footer className="border-t border-zinc-800 px-6 py-10 text-center text-zinc-500">
        <p>Анатолий — репетитор по физике ЕГЭ</p>
        <p className="mt-2">Telegram: @Tobilk1011</p>
      </footer>
      </div>
      {isContactModalOpen && (
  <div
    onClick={() => setIsContactModalOpen(false)}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          Записаться
        </h2>

        <button
          onClick={() => setIsContactModalOpen(false)}
          className="text-2xl text-zinc-400 transition hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <a
          href="https://t.me/Tobilk1011"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl bg-white px-6 py-4 text-center text-lg font-semibold text-black transition hover:scale-[1.02]"
        >
          Telegram — @Tobilk1011
        </a>

        <a
          href="https://vk.ru/anatolyphys"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-4 text-center text-lg font-semibold text-white transition hover:scale-[1.02]"
        >
          ВКонтакте
        </a>

        <a
          href="tel:+79000658503"
          className="block rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-4 text-center text-lg font-semibold text-white transition hover:scale-[1.02]"
        >
          +7 900 065-85-03
        </a>
      </div>
    </div>
  </div>
)}
    </main>
  );
}