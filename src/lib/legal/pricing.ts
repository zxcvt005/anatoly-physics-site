export interface ServicePackage {
  id: string;
  title: string;
  priceRub: number;
  lessonsCount: number;
  lessonDurationMinutes: number;
  periodLabel: string;
  serviceDescription: string;
}

export const SERVICE_PACKAGES: ServicePackage[] = [
  {
    id: 'package-8',
    title: 'Пакет занятий «8 занятий»',
    priceRub: 24_000,
    lessonsCount: 8,
    lessonDurationMinutes: 60,
    periodLabel: '8 занятий в течение 1 календарного месяца',
    serviceDescription:
      '8 онлайн-занятий по подготовке к ЕГЭ по физике, доступ к авторским материалам, консультационная поддержка, проверка домашних заданий, сопровождение через систему «Помогатор».',
  },
  {
    id: 'package-12',
    title: 'Пакет занятий «12 занятий»',
    priceRub: 35_000,
    lessonsCount: 12,
    lessonDurationMinutes: 60,
    periodLabel: '12 занятий в течение 1 календарного месяца',
    serviceDescription:
      '12 онлайн-занятий по подготовке к ЕГЭ по физике, доступ к авторским материалам, консультационная поддержка, проверка домашних заданий, сопровождение через систему «Помогатор».',
  },
];

export const REMOTE_SERVICE_FORMAT =
  'Дистанционно посредством информационно-телекоммуникационной сети «Интернет».';

export function formatPriceRub(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} ₽`;
}

export function formatPriceRubWords(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} рублей`;
}
