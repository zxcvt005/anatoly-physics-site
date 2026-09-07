export type SummerSchoolPlaceId = 'third' | 'second' | 'first';

export type SummerSchoolPlaceScale = 'moderate' | 'expressive' | 'grand';

export type SummerSchoolPlaceContent = {
  id: SummerSchoolPlaceId;
  rank: string;
  title: string;
  winnerName: string;
  scale: SummerSchoolPlaceScale;
  showCongratulations: boolean;
  prizeLabel: string;
  prizeName: string;
  prizeSubtitle?: string;
  prizeDescription: string;
  imageSrc: string;
  imageAlt: string;
};

/** Official final results of Summer School 2026 — fixed in code. */
export const SUMMER_SCHOOL_WINNERS = {
  third: 'Елизавета Лисовская',
  second: 'Владислава Ильичева',
  first: 'Юлия Тарновская',
} as const;

export const SUMMER_SCHOOL_IMAGES = {
  alice: '/images/summer-school/alice.png',
  wildberries: '/images/summer-school/wildberries.png',
  educationCertificate: '/images/summer-school/education-certificate.png',
  ipad: '/images/summer-school/ipad.png',
} as const;

export const SUMMER_SCHOOL_PLACES: Record<
  SummerSchoolPlaceId,
  SummerSchoolPlaceContent
> = {
  third: {
    id: 'third',
    rank: '03',
    title: 'ТРЕТЬЕ МЕСТО',
    winnerName: SUMMER_SCHOOL_WINNERS.third,
    scale: 'moderate',
    showCongratulations: true,
    prizeLabel: 'ПРИЗ',
    prizeName: 'Колонка Алиса',
    prizeDescription:
      'Умная колонка Алиса — полезный помощник для дома, музыки и повседневных задач.',
    imageSrc: SUMMER_SCHOOL_IMAGES.alice,
    imageAlt: 'Колонка Алиса',
  },
  second: {
    id: 'second',
    rank: '02',
    title: 'ВТОРОЕ МЕСТО',
    winnerName: SUMMER_SCHOOL_WINNERS.second,
    scale: 'expressive',
    showCongratulations: true,
    prizeLabel: 'ПРИЗ',
    prizeName: 'Сертификат Wildberries',
    prizeSubtitle: '10 000 ₽',
    prizeDescription:
      'Подарочный сертификат Wildberries на 10 000 ₽ — чтобы выбрать именно то, что хочется.',
    imageSrc: SUMMER_SCHOOL_IMAGES.wildberries,
    imageAlt: 'Сертификат Wildberries на 10 000 ₽',
  },
  first: {
    id: 'first',
    rank: '01',
    title: 'ПЕРВОЕ МЕСТО',
    winnerName: SUMMER_SCHOOL_WINNERS.first,
    scale: 'grand',
    showCongratulations: false,
    prizeLabel: 'ГЛАВНЫЙ ПРИЗ',
    prizeName: '3 МЕСЯЦА',
    prizeSubtitle: 'БЕСПЛАТНОГО ОБУЧЕНИЯ',
    prizeDescription:
      'Три месяца бесплатного обучения — главный приз летней школы.',
    imageSrc: SUMMER_SCHOOL_IMAGES.educationCertificate,
    imageAlt: 'Сертификат на три месяца бесплатного обучения',
  },
};
