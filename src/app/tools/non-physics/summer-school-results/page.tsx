import type { Metadata } from 'next';
import { SummerSchoolResults } from '@/components/tools/summer-school/SummerSchoolResults';

export const metadata: Metadata = {
  title: 'Итоги летней школы — Инструменты по физике',
  description:
    'Презентация итогов летней школы: победители, призы и розыгрыш iPad.',
  robots: { index: false, follow: false },
};

export default function SummerSchoolResultsPage() {
  return <SummerSchoolResults />;
}
