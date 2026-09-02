export type ToolsNodeType = 'home' | 'section' | 'subsection' | 'tool';

export type ToolsIconName =
  | 'home'
  | 'mechanics'
  | 'kinematics'
  | 'dynamics'
  | 'statics'
  | 'hydrostatics'
  | 'conservation'
  | 'molecular'
  | 'mkt'
  | 'thermodynamics'
  | 'electrodynamics'
  | 'electrostatics'
  | 'dcCurrent'
  | 'magneticField'
  | 'optics'
  | 'oscillations'
  | 'quantum'
  | 'nonPhysics'
  | 'fortuneWheel'
  | 'summerSchool';

export type ToolsNavItem = {
  id: string;
  title: string;
  path: string;
  description: string;
  subtitle: string;
  icon: ToolsIconName;
  type: ToolsNodeType;
  studyTopic?: string;
  simulationCount?: number;
  children?: ToolsNavItem[];
};

export type ToolsBreadcrumbItem = {
  title: string;
  path: string;
};

export const TOOLS_HOME_PATH = '/tools';

export const toolsNavigation: ToolsNavItem[] = [
  {
    id: 'home',
    title: 'Главная',
    path: TOOLS_HOME_PATH,
    description: 'Библиотека интерактивных инструментов',
    subtitle: 'Интерактивные инструменты для изучения физики и не только',
    icon: 'home',
    type: 'home',
  },
  {
    id: 'mechanics',
    title: 'Механика',
    path: '/tools/mechanics',
    description: 'Движение, силы, равновесие и законы сохранения',
    subtitle: 'Интерактивные инструменты для изучения механики',
    icon: 'mechanics',
    type: 'section',
    children: [
      {
        id: 'kinematics',
        title: 'Кинематика',
        path: '/tools/mechanics/kinematics',
        description: 'Движение тел, скорость, ускорение и графики',
        subtitle: 'Интерактивные симуляции для изучения кинематики',
        icon: 'kinematics',
        type: 'subsection',
        studyTopic: 'кинематики',
        simulationCount: 0,
      },
      {
        id: 'dynamics',
        title: 'Динамика',
        path: '/tools/mechanics/dynamics',
        description: 'Силы, законы Ньютона и движение под действием сил',
        subtitle: 'Интерактивные симуляции для изучения динамики',
        icon: 'dynamics',
        type: 'subsection',
        studyTopic: 'динамики',
        simulationCount: 0,
      },
      {
        id: 'statics',
        title: 'Статика',
        path: '/tools/mechanics/statics',
        description: 'Равновесие тел, моменты сил и опоры',
        subtitle: 'Интерактивные симуляции для изучения статики',
        icon: 'statics',
        type: 'subsection',
        studyTopic: 'статики',
        simulationCount: 0,
      },
      {
        id: 'hydrostatics',
        title: 'Гидростатика',
        path: '/tools/mechanics/hydrostatics',
        description: 'Давление жидкости, закон Паскаля и архимедова сила',
        subtitle: 'Интерактивные симуляции для изучения гидростатики',
        icon: 'hydrostatics',
        type: 'subsection',
        studyTopic: 'гидростатики',
        simulationCount: 0,
      },
      {
        id: 'conservation-laws',
        title: 'Законы сохранения',
        path: '/tools/mechanics/conservation-laws',
        description: 'Импульс, энергия и законы сохранения в механике',
        subtitle: 'Интерактивные симуляции для изучения законов сохранения',
        icon: 'conservation',
        type: 'subsection',
        studyTopic: 'законов сохранения',
        simulationCount: 0,
      },
    ],
  },
  {
    id: 'molecular',
    title: 'Молекулярная физика',
    path: '/tools/molecular',
    description: 'Строение вещества, температура и тепловые процессы',
    subtitle: 'Интерактивные инструменты для изучения молекулярной физики',
    icon: 'molecular',
    type: 'section',
    children: [
      {
        id: 'mkt',
        title: 'МКТ',
        path: '/tools/molecular/mkt',
        description: 'Молекулы, давление газа и основное уравнение МКТ',
        subtitle: 'Интерактивные симуляции для изучения МКТ',
        icon: 'mkt',
        type: 'subsection',
        studyTopic: 'МКТ',
        simulationCount: 0,
      },
      {
        id: 'thermodynamics',
        title: 'Термодинамика',
        path: '/tools/molecular/thermodynamics',
        description: 'Внутренняя энергия, теплота и законы термодинамики',
        subtitle: 'Интерактивные симуляции для изучения термодинамики',
        icon: 'thermodynamics',
        type: 'subsection',
        studyTopic: 'термодинамики',
        simulationCount: 0,
      },
    ],
  },
  {
    id: 'electrodynamics',
    title: 'Электродинамика',
    path: '/tools/electrodynamics',
    description: 'Электрическое поле, ток и магнитные явления',
    subtitle: 'Интерактивные инструменты для изучения электродинамики',
    icon: 'electrodynamics',
    type: 'section',
    children: [
      {
        id: 'electrostatics',
        title: 'Электростатика',
        path: '/tools/electrodynamics/electrostatics',
        description: 'Заряды, поле Кулона и электрический потенциал',
        subtitle: 'Интерактивные симуляции для изучения электростатики',
        icon: 'electrostatics',
        type: 'subsection',
        studyTopic: 'электростатики',
        simulationCount: 0,
      },
      {
        id: 'dc-current',
        title: 'Постоянный ток',
        path: '/tools/electrodynamics/dc-current',
        description: 'Цепи постоянного тока, закон Ома и сопротивление',
        subtitle: 'Интерактивные симуляции для изучения постоянного тока',
        icon: 'dcCurrent',
        type: 'subsection',
        studyTopic: 'постоянного тока',
        simulationCount: 0,
      },
      {
        id: 'magnetic-field',
        title: 'Магнитное поле',
        path: '/tools/electrodynamics/magnetic-field',
        description: 'Магнитное поле, сила Ампера и сила Лоренца',
        subtitle: 'Интерактивные симуляции для изучения магнитного поля',
        icon: 'magneticField',
        type: 'subsection',
        studyTopic: 'магнитного поля',
        simulationCount: 0,
      },
    ],
  },
  {
    id: 'optics',
    title: 'Оптика',
    path: '/tools/optics',
    description: 'Свет, отражение, преломление и оптические приборы',
    subtitle: 'Интерактивные инструменты для изучения оптики',
    icon: 'optics',
    type: 'section',
    studyTopic: 'оптики',
    simulationCount: 0,
  },
  {
    id: 'oscillations',
    title: 'Колебания и волны',
    path: '/tools/oscillations',
    description: 'Гармонические колебания, волны и резонанс',
    subtitle: 'Интерактивные инструменты для изучения колебаний и волн',
    icon: 'oscillations',
    type: 'section',
    studyTopic: 'колебаний и волн',
    simulationCount: 0,
  },
  {
    id: 'quantum',
    title: 'Квантовая физика',
    path: '/tools/quantum',
    description: 'Фотоны, кванты энергии и строение атома',
    subtitle: 'Интерактивные инструменты для изучения квантовой физики',
    icon: 'quantum',
    type: 'section',
    studyTopic: 'квантовой физики',
    simulationCount: 0,
  },
  {
    id: 'non-physics',
    title: 'Не физика',
    path: '/tools/non-physics',
    description: 'Полезные инструменты для занятий и мероприятий',
    subtitle: 'Инструменты для занятий, конкурсов и мероприятий',
    icon: 'nonPhysics',
    type: 'section',
    children: [
      {
        id: 'fortune-wheel',
        title: 'Колесо фортуны',
        path: '/tools/non-physics/fortune-wheel',
        description: 'Розыгрыш по количеству билетов с визуальным колесом',
        subtitle: 'Инструмент для проведения розыгрыша',
        icon: 'fortuneWheel',
        type: 'tool',
      },
      {
        id: 'summer-school-results',
        title: 'Итоги летней школы',
        path: '/tools/non-physics/summer-school-results',
        description: 'Презентация победителей, призов и розыгрыша iPad',
        subtitle: 'Итоги летней школы',
        icon: 'summerSchool',
        type: 'tool',
      },
    ],
  },
];

export function normalizeToolsPath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
}

export function flattenToolsNavigation(
  items: ToolsNavItem[] = toolsNavigation,
): ToolsNavItem[] {
  const result: ToolsNavItem[] = [];

  for (const item of items) {
    result.push(item);
    if (item.children?.length) {
      result.push(...flattenToolsNavigation(item.children));
    }
  }

  return result;
}

export function getLibrarySections(): ToolsNavItem[] {
  return toolsNavigation.filter((item) => item.type !== 'home');
}

export function findNavItemByPath(
  pathname: string,
  items: ToolsNavItem[] = toolsNavigation,
): ToolsNavItem | null {
  const current = normalizeToolsPath(pathname);

  for (const item of items) {
    if (normalizeToolsPath(item.path) === current) {
      return item;
    }

    if (item.children?.length) {
      const nested = findNavItemByPath(current, item.children);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

export function findParentNavItem(pathname: string): ToolsNavItem | null {
  const current = normalizeToolsPath(pathname);

  for (const item of toolsNavigation) {
    if (!item.children?.length) {
      continue;
    }

    if (item.children.some((child) => normalizeToolsPath(child.path) === current)) {
      return item;
    }
  }

  return null;
}

export function isToolsHome(pathname: string): boolean {
  return normalizeToolsPath(pathname) === TOOLS_HOME_PATH;
}

export function isNavItemActive(path: string, pathname: string): boolean {
  const current = normalizeToolsPath(pathname);
  const target = normalizeToolsPath(path);

  if (target === TOOLS_HOME_PATH) {
    return current === TOOLS_HOME_PATH;
  }

  return current === target || current.startsWith(`${target}/`);
}

export function isExactNavItemActive(path: string, pathname: string): boolean {
  return normalizeToolsPath(path) === normalizeToolsPath(pathname);
}

export function shouldExpandNavItem(item: ToolsNavItem, pathname: string): boolean {
  if (!item.children?.length) {
    return false;
  }

  return isNavItemActive(item.path, pathname);
}

export function getSectionTitle(pathname: string): string {
  const item = findNavItemByPath(pathname);
  return item?.title ?? 'Раздел';
}

export function isValidToolsPath(pathname: string): boolean {
  if (isToolsHome(pathname)) {
    return true;
  }

  return findNavItemByPath(pathname) !== null;
}

export function getBreadcrumbs(pathname: string): ToolsBreadcrumbItem[] {
  const crumbs: ToolsBreadcrumbItem[] = [
    { title: 'Инструменты', path: TOOLS_HOME_PATH },
  ];

  const current = normalizeToolsPath(pathname);
  if (current === TOOLS_HOME_PATH) {
    return crumbs;
  }

  const walk = (
    items: ToolsNavItem[],
    ancestors: ToolsNavItem[],
  ): boolean => {
    for (const item of items) {
      if (item.type === 'home') {
        continue;
      }

      const trail = [...ancestors, item];
      if (normalizeToolsPath(item.path) === current) {
        for (const node of trail) {
          crumbs.push({ title: node.title, path: node.path });
        }
        return true;
      }

      if (item.children?.length && walk(item.children, trail)) {
        return true;
      }
    }

    return false;
  };

  walk(toolsNavigation, []);
  return crumbs;
}

export function getSimulationCount(item: ToolsNavItem): number {
  if (typeof item.simulationCount === 'number') {
    return item.simulationCount;
  }

  if (!item.children?.length) {
    return 0;
  }

  return item.children.reduce(
    (sum, child) => sum + getSimulationCount(child),
    0,
  );
}

export function pluralizeRu(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }

  return many;
}

export function formatCountLabel(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  return `${count} ${pluralizeRu(count, one, few, many)}`;
}

export function getSectionCardMeta(item: ToolsNavItem): string {
  const children = item.children ?? [];

  if (children.length > 0) {
    if (children.every((child) => child.type === 'tool')) {
      return formatCountLabel(
        children.length,
        'инструмент',
        'инструмента',
        'инструментов',
      );
    }

    return formatCountLabel(children.length, 'раздел', 'раздела', 'разделов');
  }

  return formatCountLabel(
    getSimulationCount(item),
    'симуляция',
    'симуляции',
    'симуляций',
  );
}

export function getChildCardMeta(item: ToolsNavItem): string {
  if (item.type === 'tool') {
    return 'Готов к использованию';
  }

  return formatCountLabel(
    getSimulationCount(item),
    'симуляция',
    'симуляции',
    'симуляций',
  );
}

export function getEmptyStateDescription(item: ToolsNavItem): string {
  if (item.studyTopic) {
    return `Здесь появятся интерактивные инструменты для изучения ${item.studyTopic}.`;
  }

  return `Здесь появятся интерактивные инструменты по теме «${item.title}».`;
}

export function getCatchAllStaticSlugs(): string[][] {
  return flattenToolsNavigation()
    .filter((item) => item.type === 'section' || item.type === 'subsection')
    .map((item) => item.path.replace(/^\/tools\//, '').split('/'));
}

export const DEDICATED_TOOL_PATHS = [
  '/tools/non-physics/fortune-wheel',
  '/tools/non-physics/summer-school-results',
] as const;
