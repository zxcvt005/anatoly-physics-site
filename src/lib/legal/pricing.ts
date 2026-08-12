export interface ServicePackage {
  id: string;
  title: string;
  priceRub: number;
  lessonsCount: number;
  lessonDurationMinutes: number;
  periodLabel: string;
  includes: string[];
}

export const SERVICE_PACKAGES: ServicePackage[] = [
  {
    id: 'package-8',
    title: '8 занятий',
    priceRub: 24_000,
    lessonsCount: 8,
    lessonDurationMinutes: 60,
    periodLabel: '8 занятий в течение 1 календарного месяца',
    includes: [
      '8 онлайн-занятий по подготовке к ЕГЭ по физике',
      'Доступ к авторским учебным материалам',
      'Консультационная поддержка',
      'Проверка домашних заданий',
      'Сопровождение ученика через систему «Помогатор»',
    ],
  },
  {
    id: 'package-12',
    title: '12 занятий',
    priceRub: 35_000,
    lessonsCount: 12,
    lessonDurationMinutes: 60,
    periodLabel: '12 занятий в течение 1 календарного месяца',
    includes: [
      '12 онлайн-занятий по подготовке к ЕГЭ по физике',
      'Доступ к авторским учебным материалам',
      'Консультационная поддержка',
      'Проверка домашних заданий',
      'Сопровождение ученика через систему «Помогатор»',
    ],
  },
];

export const REMOTE_SERVICE_FORMAT =
  'Дистанционно, в том числе посредством информационно-телекоммуникационной сети «Интернет».';

export function formatPriceRub(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} ₽`;
}
