type TestsStatCardProps = {
  value: string;
  label: string;
  accent?: boolean;
};

export function TestsStatCard({ value, label, accent = false }: TestsStatCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 sm:p-6 ${
        accent
          ? 'border-[#3166F0]/30 bg-[#3166F0]/10 hover:border-[#3166F0]/50'
          : 'border-zinc-800 bg-zinc-950/80 hover:border-zinc-700'
      }`}
    >
      <p
        className={`text-3xl font-bold tracking-tight sm:text-4xl ${
          accent ? 'text-[#9eb6ff]' : 'text-white'
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-zinc-400">{label}</p>
    </div>
  );
}
