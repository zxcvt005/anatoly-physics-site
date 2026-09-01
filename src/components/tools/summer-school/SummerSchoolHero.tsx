export function SummerSchoolHero() {
  return (
    <section className="relative flex min-h-[calc(100svh-8.5rem)] flex-col justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/70 px-5 py-16 sm:px-10 sm:py-20 lg:px-14">
      <div
        className="pointer-events-none absolute -right-16 top-8 select-none text-[7rem] font-bold leading-none text-white/[0.035] sm:text-[10rem] md:text-[13rem]"
        aria-hidden
      >
        2026
      </div>
      <div
        className="pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[#3166F0]/18 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-[#3166F0]/10 blur-3xl"
        aria-hidden
      />

      <div className="relative max-w-3xl">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.42em] text-[#3166F0] sm:text-sm">
          Летняя школа · 2026
        </p>
        <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl">
          Итоги летней школы
        </h1>
        <p className="mt-8 text-xl font-medium leading-snug text-zinc-200 sm:text-3xl">
          Это лето было не только про физику.
        </p>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-xl">
          Мы учились, соревновались, выполняли задания, зарабатывали баллы и
          собирали их ради главного — возможности побороться за реальные призы.
        </p>
      </div>
    </section>
  );
}
