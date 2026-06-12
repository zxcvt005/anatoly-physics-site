import Link from 'next/link';
import { TutorPageShell } from '@/components/tutor/TutorPageShell';

export default function StudentNotFound() {
  return (
    <TutorPageShell title="Страница не найдена">
      <p className="mb-6 text-zinc-400">
        Ссылка недействительна или устарела. Обратитесь к репетитору за новой
        ссылкой.
      </p>
      <Link
        href="/"
        className="inline-flex rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
      >
        На главную
      </Link>
    </TutorPageShell>
  );
}
