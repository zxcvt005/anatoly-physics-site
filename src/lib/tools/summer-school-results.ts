export const SUMMER_SCHOOL_RESULTS_STORAGE_KEY = 'summer-school-results';

export type SummerSchoolPlaceId = 'third' | 'second' | 'first';

export type SummerSchoolResultsState = {
  thirdPlaceName: string;
  secondPlaceName: string;
  firstPlaceName: string;
  thirdPlaceRevealed: boolean;
  secondPlaceRevealed: boolean;
  firstPlaceRevealed: boolean;
  settingsHidden: boolean;
};

export type SummerSchoolPlaceScale = 'moderate' | 'expressive' | 'grand';

export type SummerSchoolPlaceContent = {
  id: SummerSchoolPlaceId;
  rank: string;
  title: string;
  nameKey: keyof Pick<
    SummerSchoolResultsState,
    'thirdPlaceName' | 'secondPlaceName' | 'firstPlaceName'
  >;
  revealedKey: keyof Pick<
    SummerSchoolResultsState,
    'thirdPlaceRevealed' | 'secondPlaceRevealed' | 'firstPlaceRevealed'
  >;
  scale: SummerSchoolPlaceScale;
  showCongratulations: boolean;
  prizeLabel: string;
  prizeName: string;
  prizeSubtitle?: string;
  prizeDescription: string;
  imageSrc: string;
  imageAlt: string;
};

export const DEFAULT_SUMMER_SCHOOL_RESULTS: SummerSchoolResultsState = {
  thirdPlaceName: '',
  secondPlaceName: '',
  firstPlaceName: '',
  thirdPlaceRevealed: false,
  secondPlaceRevealed: false,
  firstPlaceRevealed: false,
  settingsHidden: false,
};

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
    nameKey: 'thirdPlaceName',
    revealedKey: 'thirdPlaceRevealed',
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
    nameKey: 'secondPlaceName',
    revealedKey: 'secondPlaceRevealed',
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
    nameKey: 'firstPlaceName',
    revealedKey: 'firstPlaceRevealed',
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

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseSummerSchoolResults(
  raw: string | null,
): SummerSchoolResultsState {
  if (!raw) {
    return { ...DEFAULT_SUMMER_SCHOOL_RESULTS };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SummerSchoolResultsState>;
    const thirdPlaceName = asTrimmedString(parsed.thirdPlaceName);
    const secondPlaceName = asTrimmedString(parsed.secondPlaceName);
    const firstPlaceName = asTrimmedString(parsed.firstPlaceName);

    return {
      thirdPlaceName,
      secondPlaceName,
      firstPlaceName,
      thirdPlaceRevealed: parsed.thirdPlaceRevealed === true && thirdPlaceName.length > 0,
      secondPlaceRevealed:
        parsed.secondPlaceRevealed === true && secondPlaceName.length > 0,
      firstPlaceRevealed: parsed.firstPlaceRevealed === true && firstPlaceName.length > 0,
      settingsHidden: parsed.settingsHidden === true,
    };
  } catch {
    return { ...DEFAULT_SUMMER_SCHOOL_RESULTS };
  }
}

export function serializeSummerSchoolResults(
  state: SummerSchoolResultsState,
): string {
  const normalized: SummerSchoolResultsState = {
    thirdPlaceName: state.thirdPlaceName.trim(),
    secondPlaceName: state.secondPlaceName.trim(),
    firstPlaceName: state.firstPlaceName.trim(),
    thirdPlaceRevealed:
      state.thirdPlaceRevealed && state.thirdPlaceName.trim().length > 0,
    secondPlaceRevealed:
      state.secondPlaceRevealed && state.secondPlaceName.trim().length > 0,
    firstPlaceRevealed:
      state.firstPlaceRevealed && state.firstPlaceName.trim().length > 0,
    settingsHidden: state.settingsHidden,
  };

  return JSON.stringify(normalized);
}

export function getPlaceName(
  state: SummerSchoolResultsState,
  placeId: SummerSchoolPlaceId,
): string {
  return state[SUMMER_SCHOOL_PLACES[placeId].nameKey];
}

export function isPlaceRevealed(
  state: SummerSchoolResultsState,
  placeId: SummerSchoolPlaceId,
): boolean {
  return state[SUMMER_SCHOOL_PLACES[placeId].revealedKey];
}
