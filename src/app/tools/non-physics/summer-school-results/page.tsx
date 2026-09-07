import type { Metadata } from 'next';
import { SummerSchoolResults } from '@/components/tools/summer-school/SummerSchoolResults';

export const metadata: Metadata = {
  title: 'Итоги летней школы 2026 — Инструменты по физике',
  description:
    'Официальные итоги летней школы 2026: победители, призы и розыгрыш iPad.',
  robots: { index: false, follow: false },
};

export default function SummerSchoolResultsPage() {
  return <SummerSchoolResults />;
}
