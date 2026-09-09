import type { Metadata } from 'next';
import { EgeChecker } from '@/components/tools/ege-checker/EgeChecker';

export const metadata: Metadata = {
  title: 'Проверка первой части ЕГЭ — Инструменты по физике',
  description:
    'Быстрая проверка первой части ЕГЭ по физике: эталонные ответы, ввод ответов ученика и баллы по официальной методике.',
  robots: { index: false, follow: false },
};

export default function EgeCheckerPage() {
  return <EgeChecker />;
}
