export type SizeScaleDimension =
  | 'diameter'
  | 'length'
  | 'height'
  | 'characteristic'
  | 'event-horizon';

export type SizeScaleObject = {
  id: string;
  name: string;
  sizeMeters: number;
  displayDimension: SizeScaleDimension;
  image: string;
};

export const SIZE_SCALE_OBJECTS: readonly SizeScaleObject[] = [
  {
    id: 'proton',
    name: 'Протон',
    sizeMeters: 1.68e-15,
    displayDimension: 'diameter',
    image: '/images/size-scale/proton.png',
  },
  {
    id: 'atom',
    name: 'Атом',
    sizeMeters: 5e-11,
    displayDimension: 'diameter',
    image: '/images/size-scale/atom.png',
  },
  {
    id: 'virus',
    name: 'Вирус',
    sizeMeters: 1e-7,
    displayDimension: 'diameter',
    image: '/images/size-scale/virus.png',
  },
  {
    id: 'bacteria',
    name: 'Бактерия',
    sizeMeters: 1e-6,
    displayDimension: 'length',
    image: '/images/size-scale/bacteria.png',
  },
  {
    id: 'skin-cell',
    name: 'Клетка кожи',
    sizeMeters: 3e-5,
    displayDimension: 'diameter',
    image: '/images/size-scale/skin-cell.png',
  },
  {
    id: 'tardigrade',
    name: 'Тихоходка',
    sizeMeters: 5e-4,
    displayDimension: 'length',
    image: '/images/size-scale/tardigrade.png',
  },
  {
    id: 'ant',
    name: 'Муравей',
    sizeMeters: 5e-3,
    displayDimension: 'length',
    image: '/images/size-scale/ant.png',
  },
  {
    id: 'smallest-dog',
    name: 'Самая маленькая собака',
    sizeMeters: 0.0914,
    displayDimension: 'height',
    image: '/images/size-scale/smallest-dog.png',
  },
  {
    id: 'grandmother',
    name: 'Среднестатистическая бабушка',
    sizeMeters: 1.6,
    displayDimension: 'height',
    image: '/images/size-scale/grandmother.png',
  },
  {
    id: 'chelyabinsk-meteor',
    name: 'Челябинский метеорит',
    sizeMeters: 20,
    displayDimension: 'characteristic',
    image: '/images/size-scale/chelyabinsk-meteor.png',
  },
  {
    id: 'belaz-75710',
    name: 'БелАЗ-75710',
    sizeMeters: 20.6,
    displayDimension: 'length',
    image: '/images/size-scale/belaz-75710.png',
  },
  {
    id: 'burj-khalifa',
    name: 'Бурдж-Халифа',
    sizeMeters: 828,
    displayDimension: 'height',
    image: '/images/size-scale/burj-khalifa.png',
  },
  {
    id: 'everest',
    name: 'Гора Эверест',
    sizeMeters: 8848.86,
    displayDimension: 'height',
    image: '/images/size-scale/everest.png',
  },
  {
    id: 'moon',
    name: 'Луна',
    sizeMeters: 3.4748e6,
    displayDimension: 'diameter',
    image: '/images/size-scale/moon.png',
  },
  {
    id: 'earth',
    name: 'Земля',
    sizeMeters: 1.2742e7,
    displayDimension: 'diameter',
    image: '/images/size-scale/earth.png',
  },
  {
    id: 'jupiter',
    name: 'Юпитер',
    sizeMeters: 1.3982e8,
    displayDimension: 'diameter',
    image: '/images/size-scale/jupiter.png',
  },
  {
    id: 'sun',
    name: 'Солнце',
    sizeMeters: 1.3927e9,
    displayDimension: 'diameter',
    image: '/images/size-scale/sun.png',
  },
];

export const LIGHT_YEAR_METERS = 9.4607e15;

export const MIN_VISUAL_PX = 8;

export function dimensionLabel(dimension: SizeScaleDimension): string {
  switch (dimension) {
    case 'diameter':
      return 'диаметр';
    case 'length':
      return 'длина';
    case 'height':
      return 'высота';
    case 'characteristic':
      return 'характерный размер';
    case 'event-horizon':
      return 'диаметр горизонта событий';
  }
}

export function anchorKind(
  dimension: SizeScaleDimension,
): 'base' | 'center' {
  return dimension === 'height' ? 'base' : 'center';
}
