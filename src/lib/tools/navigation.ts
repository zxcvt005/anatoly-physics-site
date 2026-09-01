export type ToolsNavItem = {
  id: string;
  label: string;
  href: string;
  children?: ToolsNavItem[];
};

export const toolsNavigation: ToolsNavItem[] = [
  {
    id: 'home',
    label: 'Главная',
    href: '/tools',
  },
  {
    id: 'mechanics',
    label: 'Механика',
    href: '/tools/mechanics',
    children: [
      {
        id: 'kinematics',
        label: 'Кинематика',
        href: '/tools/mechanics/kinematics',
      },
      {
        id: 'dynamics',
        label: 'Динамика',
        href: '/tools/mechanics/dynamics',
      },
      {
        id: 'statics',
        label: 'Статика',
        href: '/tools/mechanics/statics',
      },
    ],
  },
  {
    id: 'molecular',
    label: 'Молекулярная физика',
    href: '/tools/molecular',
    children: [
      {
        id: 'mkt',
        label: 'Молекулярно-кинетическая теория',
        href: '/tools/molecular/mkt',
      },
      {
        id: 'thermodynamics',
        label: 'Термодинамика',
        href: '/tools/molecular/thermodynamics',
      },
    ],
  },
  {
    id: 'electrodynamics',
    label: 'Электродинамика',
    href: '/tools/electrodynamics',
    children: [
      {
        id: 'electrostatics',
        label: 'Электростатика',
        href: '/tools/electrodynamics/electrostatics',
      },
      {
        id: 'dc-current',
        label: 'Постоянный ток',
        href: '/tools/electrodynamics/dc-current',
      },
      {
        id: 'magnetic-field',
        label: 'Магнитное поле',
        href: '/tools/electrodynamics/magnetic-field',
      },
    ],
  },
  {
    id: 'optics',
    label: 'Оптика',
    href: '/tools/optics',
  },
  {
    id: 'oscillations',
    label: 'Колебания и волны',
    href: '/tools/oscillations',
  },
  {
    id: 'quantum',
    label: 'Квантовая физика',
    href: '/tools/quantum',
  },
  {
    id: 'non-physics',
    label: 'Не физика',
    href: '/tools/non-physics',
    children: [
      {
        id: 'fortune-wheel',
        label: 'Колесо фортуны',
        href: '/tools/non-physics/fortune-wheel',
      },
      {
        id: 'summer-school-results',
        label: 'Итоги летней школы',
        href: '/tools/non-physics/summer-school-results',
      },
    ],
  },
];

export type ToolPlaceholder = {
  id: string;
  title: string;
  description: string;
  category: string;
  accent: 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan';
};

export const toolPlaceholders: ToolPlaceholder[] = [
  {
    id: 'body-motion',
    title: 'Движение тела',
    description: 'Интерактивные модели движения и траекторий',
    category: 'Механика',
    accent: 'blue',
  },
  {
    id: 'forces-motion',
    title: 'Силы и движение',
    description: 'Визуализация сил, ускорения и взаимодействий',
    category: 'Механика',
    accent: 'violet',
  },
  {
    id: 'free-fall',
    title: 'Свободное падение',
    description: 'Наблюдайте за падением и движением под действием g',
    category: 'Кинематика',
    accent: 'emerald',
  },
  {
    id: 'ohms-law',
    title: 'Закон Ома',
    description: 'Связь напряжения, тока и сопротивления в цепи',
    category: 'Электродинамика',
    accent: 'amber',
  },
  {
    id: 'lc-circuit',
    title: 'Колебательный контур',
    description: 'Электромагнитные колебания и резонанс',
    category: 'Колебания',
    accent: 'rose',
  },
  {
    id: 'light-refraction',
    title: 'Преломление света',
    description: 'Закон Снеллиуса и поведение лучей на границе сред',
    category: 'Оптика',
    accent: 'cyan',
  },
];

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
}

export function isToolsHome(pathname: string): boolean {
  return normalizePath(pathname) === '/tools';
}

export function isNavItemActive(href: string, pathname: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (target === '/tools') {
    return current === '/tools';
  }

  return current === target || current.startsWith(`${target}/`);
}

export function findNavItemByPath(pathname: string): ToolsNavItem | null {
  const current = normalizePath(pathname);

  for (const item of toolsNavigation) {
    if (normalizePath(item.href) === current) {
      return item;
    }

    if (item.children) {
      for (const child of item.children) {
        if (normalizePath(child.href) === current) {
          return child;
        }
      }
    }
  }

  return null;
}

export function getSectionTitle(pathname: string): string {
  const item = findNavItemByPath(pathname);
  return item?.label ?? 'Раздел';
}

export function isValidToolsPath(pathname: string): boolean {
  if (isToolsHome(pathname)) {
    return true;
  }

  return findNavItemByPath(pathname) !== null;
}
