export function SummerSchoolFinal() {
  return (
    <section className="relative flex min-h-[min(56vh,32rem)] flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/70 px-5 py-20 text-center">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(49,102,240,0.12),transparent_58%)]"
        aria-hidden
      />
      <div className="relative max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.42em] text-[#3166F0] sm:text-sm">
          Летняя школа · 2026
        </p>
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Спасибо всем участникам.
        </h2>
        <p className="mt-6 text-lg text-zinc-400 sm:text-2xl">
          До встречи в новом учебном году.
        </p>
      </div>
    </section>
  );
}
