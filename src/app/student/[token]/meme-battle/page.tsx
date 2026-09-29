import type { Metadata } from 'next';
import { MemeBattlePage } from '@/components/meme-battle/MemeBattlePage';
import { TutorPageShell } from '@/components/tutor/TutorPageShell';

type PageProps = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: 'Битва картинок',
  robots: { index: false, follow: false },
};

export default async function StudentMemeBattlePage({ params }: PageProps) {
  const { token } = await params;

  return (
    <TutorPageShell title="Битва картинок" subtitle="Помоги Анатолию собрать базу картинок" badge="Событие">
      <MemeBattlePage token={token} />
    </TutorPageShell>
  );
}
