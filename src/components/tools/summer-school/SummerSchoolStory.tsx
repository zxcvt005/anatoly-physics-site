const storyCards = [
  {
    index: '01',
    title: 'Задания',
    text: 'Выполняли задания и активности в течение лета.',
  },
  {
    index: '02',
    title: 'Баллы',
    text: 'За каждую активность начислялись баллы.',
  },
  {
    index: '03',
    title: 'Рейтинг',
    text: 'Участники соревновались между собой.',
  },
  {
    index: '04',
    title: 'Призы',
    text: 'В конце лучшие участники получили реальные призы.',
  },
] as const;

export function SummerSchoolStory() {
  return (
    <section className="px-1 py-6 sm:py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#3166F0]">
        Летняя школа
      </p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
        Как прошло это лето
      </h2>
      <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-zinc-400 sm:text-lg">
        <p>Летняя школа превратила подготовку к экзамену в небольшое соревнование.</p>
        <p>
          В течение лета участники выполняли задания, участвовали в активностях и
          получали баллы.
        </p>
        <p>
          Чем больше баллов — тем выше место в рейтинге и тем больше возможностей
          получить приз.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
        {storyCards.map((card) => (
          <article
            key={card.index}
            className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6 sm:p-8"
          >
            <p className="text-sm font-semibold tracking-[0.3em] text-[#3166F0]">
              {card.index}
            </p>
            <h3 className="mt-4 text-2xl font-bold text-white">{card.title}</h3>
            <p className="mt-3 text-base leading-relaxed text-zinc-400">{card.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SummerSchoolTransition() {
  return (
    <section className="relative flex min-h-[min(72vh,40rem)] flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/70 px-5 py-16 text-center">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(49,102,240,0.16),transparent_62%)]"
        aria-hidden
      />
      <div className="relative">
        <p className="text-2xl font-medium text-zinc-300 sm:text-4xl">И вот теперь</p>
        <p className="mt-2 text-3xl font-bold text-white sm:text-5xl">самое главное.</p>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.5em] text-zinc-500">
          ТОП
        </p>
        <p className="mt-2 text-[7rem] font-bold leading-none text-[#3166F0] sm:text-[9rem] md:text-[11rem]">
          3
        </p>
        <p className="mt-8 text-lg leading-relaxed text-zinc-400 sm:text-xl">
          Три участника.
          <br />
          Три результата.
          <br />
          Три заслуженных приза.
        </p>
      </div>
    </section>
  );
}
