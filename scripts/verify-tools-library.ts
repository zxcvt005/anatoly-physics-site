import assert from 'node:assert/strict';
import {
  DEDICATED_TOOL_PATHS,
  findNavItemByPath,
  findParentNavItem,
  flattenToolsNavigation,
  formatCountLabel,
  getBreadcrumbs,
  getCatchAllStaticSlugs,
  getChildCardMeta,
  getEmptyStateDescription,
  getLibrarySections,
  getSectionCardMeta,
  getSimulationCount,
  isExactNavItemActive,
  isNavItemActive,
  isToolsHome,
  isValidToolsPath,
  shouldExpandNavItem,
  toolsNavigation,
  type ToolsNavItem,
} from '../src/lib/tools/navigation';
import {
  formatSimulationNumberInput,
  parseSimulationNumberInput,
  resolveSimulationNumberBlur,
  snapSimulationNumber,
  stepDecimals,
} from '../src/lib/tools/simulations/number-input';

const errors: string[] = [];
let passed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (error) {
    errors.push(
      `${name}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

test('home is the first navigation item', () => {
  assert.equal(toolsNavigation[0]?.id, 'home');
  assert.equal(toolsNavigation[0]?.path, '/tools');
  assert.equal(toolsNavigation[0]?.type, 'home');
});

test('non-physics is the last navigation section', () => {
  const last = toolsNavigation[toolsNavigation.length - 1];
  assert.equal(last?.id, 'non-physics');
  assert.equal(last?.path, '/tools/non-physics');
});

test('library sections match the expected tree', () => {
  const ids = getLibrarySections().map((item) => item.id);
  assert.deepEqual(ids, [
    'mechanics',
    'molecular',
    'electrodynamics',
    'optics',
    'oscillations',
    'quantum',
    'non-physics',
  ]);
});

test('mechanics contains five subsections including new topics', () => {
  const mechanics = toolsNavigation.find((item) => item.id === 'mechanics');
  assert.ok(mechanics);
  const children = mechanics?.children ?? [];
  assert.equal(children.length, 5);
  assert.deepEqual(
    children.map((child) => child.id),
    ['kinematics', 'dynamics', 'statics', 'hydrostatics', 'conservation-laws'],
  );
  assert.equal(children[3]?.title, 'Гидростатика');
  assert.equal(children[3]?.path, '/tools/mechanics/hydrostatics');
  assert.equal(children[4]?.title, 'Законы сохранения');
  assert.equal(children[4]?.path, '/tools/mechanics/conservation-laws');
});

test('molecular physics uses MKT as a dedicated tool', () => {
  const molecular = toolsNavigation.find((item) => item.id === 'molecular');
  const mkt = molecular?.children?.find((child) => child.id === 'mkt');
  assert.equal(molecular?.path, '/tools/molecular-physics');
  assert.equal(mkt?.title, 'МКТ');
  assert.equal(mkt?.path, '/tools/molecular-physics/mkt');
  assert.equal(mkt?.type, 'tool');
});

test('all paths and ids are unique', () => {
  const items = flattenToolsNavigation();
  const paths = items.map((item) => item.path);
  const ids = items.map((item) => item.id);

  assert.equal(new Set(paths).size, paths.length, 'duplicate paths');
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids');
});

test('child paths are nested under their parent path', () => {
  const check = (item: ToolsNavItem) => {
    for (const child of item.children ?? []) {
      assert.ok(
        child.path.startsWith(`${item.path}/`),
        `${child.path} is not nested under ${item.path}`,
      );
      check(child);
    }
  };

  for (const item of toolsNavigation) {
    check(item);
  }
});

test('every node has required library fields', () => {
  for (const item of flattenToolsNavigation()) {
    assert.ok(item.id, 'missing id');
    assert.ok(item.title, `missing title for ${item.id}`);
    assert.ok(item.path.startsWith('/tools'), `bad path for ${item.id}`);
    assert.ok(item.description, `missing description for ${item.id}`);
    assert.ok(item.subtitle, `missing subtitle for ${item.id}`);
    assert.ok(item.icon, `missing icon for ${item.id}`);
    assert.ok(item.type, `missing type for ${item.id}`);
  }
});

test('physics subsections report current simulation counts', () => {
  const subsections = flattenToolsNavigation().filter(
    (item) => item.type === 'subsection',
  );
  assert.ok(subsections.length > 0);

  for (const item of subsections) {
    const expected = item.id === 'dynamics' || item.id === 'kinematics' ? 1 : 0;
    assert.equal(getSimulationCount(item), expected);
    assert.equal(
      getChildCardMeta(item),
      expected === 1 ? '1 симуляция' : '0 симуляций',
    );
  }
});

test('section card meta uses subsection and tool counts', () => {
  const mechanics = findNavItemByPath('/tools/mechanics');
  const electrodynamics = findNavItemByPath('/tools/electrodynamics');
  const optics = findNavItemByPath('/tools/optics');
  const nonPhysics = findNavItemByPath('/tools/non-physics');

  assert.equal(getSectionCardMeta(mechanics!), '5 разделов');
  assert.equal(getSectionCardMeta(electrodynamics!), '3 раздела');
  assert.equal(getSectionCardMeta(optics!), '0 симуляций');
  assert.equal(getSectionCardMeta(nonPhysics!), '2 инструмента');
});

test('existing dedicated tool routes are preserved', () => {
  assert.deepEqual([...DEDICATED_TOOL_PATHS], [
    '/tools/mechanics/kinematics/equation',
    '/tools/mechanics/dynamics/friction',
    '/tools/molecular-physics/mkt',
    '/tools/non-physics/fortune-wheel',
    '/tools/non-physics/summer-school-results',
  ]);

  const fortuneWheel = findNavItemByPath('/tools/non-physics/fortune-wheel');
  const summerSchool = findNavItemByPath('/tools/non-physics/summer-school-results');

  assert.equal(fortuneWheel?.type, 'tool');
  assert.equal(fortuneWheel?.title, 'Колесо фортуны');
  assert.equal(summerSchool?.type, 'tool');
  assert.equal(summerSchool?.title, 'Итоги летней школы');
  assert.equal(getChildCardMeta(fortuneWheel!), 'Готов к использованию');
});

test('kinematics equation simulation is nested under mechanics kinematics', () => {
  const equation = findNavItemByPath('/tools/mechanics/kinematics/equation');
  const kinematics = findNavItemByPath('/tools/mechanics/kinematics');

  assert.equal(equation?.type, 'tool');
  assert.equal(equation?.title, 'Работа с уравнением');
  assert.equal(equation?.path, '/tools/mechanics/kinematics/equation');
  assert.equal(getSimulationCount(equation!), 1);
  assert.equal(getSimulationCount(kinematics!), 1);
  assert.equal(findParentNavItem('/tools/mechanics/kinematics/equation')?.id, 'kinematics');
  assert.equal(getChildCardMeta(equation!), 'Готов к использованию');
});

test('friction simulation is nested under mechanics dynamics', () => {
  const friction = findNavItemByPath('/tools/mechanics/dynamics/friction');
  const dynamics = findNavItemByPath('/tools/mechanics/dynamics');

  assert.equal(friction?.type, 'tool');
  assert.equal(friction?.title, 'Сила трения');
  assert.equal(friction?.path, '/tools/mechanics/dynamics/friction');
  assert.equal(getSimulationCount(friction!), 1);
  assert.equal(getSimulationCount(dynamics!), 1);
  assert.equal(findParentNavItem('/tools/mechanics/dynamics/friction')?.id, 'dynamics');
  assert.equal(findParentNavItem('/tools/mechanics/dynamics')?.id, 'mechanics');
  assert.equal(getChildCardMeta(friction!), 'Готов к использованию');
});

test('valid paths resolve and invalid paths do not', () => {
  assert.equal(isToolsHome('/tools'), true);
  assert.equal(isToolsHome('/tools/'), true);
  assert.equal(isValidToolsPath('/tools'), true);
  assert.equal(isValidToolsPath('/tools/mechanics'), true);
  assert.equal(isValidToolsPath('/tools/mechanics/kinematics'), true);
  assert.equal(isValidToolsPath('/tools/mechanics/kinematics/equation'), true);
  assert.equal(isValidToolsPath('/tools/mechanics/hydrostatics'), true);
  assert.equal(isValidToolsPath('/tools/non-physics/fortune-wheel'), true);
  assert.equal(isValidToolsPath('/tools/mechanics/dynamics/friction'), true);
  assert.equal(isValidToolsPath('/tools/missing'), false);
  assert.equal(isValidToolsPath('/tools/mechanics/unknown'), false);
  assert.equal(isValidToolsPath('/tools/mechanics/kinematics/extra'), false);
  assert.equal(findNavItemByPath('/tools/mechanics/unknown'), null);
});

test('breadcrumbs follow parent/child paths', () => {
  assert.deepEqual(getBreadcrumbs('/tools'), [
    { title: 'Инструменты', path: '/tools' },
  ]);
  assert.deepEqual(getBreadcrumbs('/tools/mechanics'), [
    { title: 'Инструменты', path: '/tools' },
    { title: 'Механика', path: '/tools/mechanics' },
  ]);
  assert.deepEqual(getBreadcrumbs('/tools/mechanics/kinematics'), [
    { title: 'Инструменты', path: '/tools' },
    { title: 'Механика', path: '/tools/mechanics' },
    { title: 'Кинематика', path: '/tools/mechanics/kinematics' },
  ]);
  assert.deepEqual(getBreadcrumbs('/tools/mechanics/kinematics/equation'), [
    { title: 'Инструменты', path: '/tools' },
    { title: 'Механика', path: '/tools/mechanics' },
    { title: 'Кинематика', path: '/tools/mechanics/kinematics' },
    { title: 'Работа с уравнением', path: '/tools/mechanics/kinematics/equation' },
  ]);
  assert.deepEqual(getBreadcrumbs('/tools/mechanics/dynamics/friction'), [
    { title: 'Инструменты', path: '/tools' },
    { title: 'Механика', path: '/tools/mechanics' },
    { title: 'Динамика', path: '/tools/mechanics/dynamics' },
    { title: 'Сила трения', path: '/tools/mechanics/dynamics/friction' },
  ]);
});

test('sidebar active and expand state stay in sync with the URL', () => {
  const mechanics = findNavItemByPath('/tools/mechanics')!;
  const kinematics = findNavItemByPath('/tools/mechanics/kinematics')!;

  assert.equal(isExactNavItemActive(mechanics.path, '/tools/mechanics'), true);
  assert.equal(
    isExactNavItemActive(mechanics.path, '/tools/mechanics/kinematics'),
    false,
  );
  assert.equal(
    isExactNavItemActive(kinematics.path, '/tools/mechanics/kinematics'),
    true,
  );
  assert.equal(isNavItemActive(mechanics.path, '/tools/mechanics/kinematics'), true);
  assert.equal(shouldExpandNavItem(mechanics, '/tools/mechanics'), true);
  assert.equal(shouldExpandNavItem(mechanics, '/tools/mechanics/kinematics'), true);
  assert.equal(shouldExpandNavItem(mechanics, '/tools'), false);
  assert.equal(
    isNavItemActive(mechanics.path, '/tools/mechanics/dynamics/friction'),
    true,
  );
  assert.equal(shouldExpandNavItem(mechanics, '/tools/mechanics/dynamics/friction'), true);
  assert.equal(
    shouldExpandNavItem(
      findNavItemByPath('/tools/mechanics/dynamics')!,
      '/tools/mechanics/dynamics/friction',
    ),
    true,
  );
  assert.equal(shouldExpandNavItem(mechanics, '/tools/optics'), false);
  assert.equal(findParentNavItem('/tools/mechanics/kinematics')?.id, 'mechanics');
});

test('catch-all static slugs include library pages but not dedicated tools', () => {
  const slugs = getCatchAllStaticSlugs().map((parts) => parts.join('/'));

  assert.ok(slugs.includes('mechanics'));
  assert.ok(slugs.includes('mechanics/kinematics'));
  assert.ok(slugs.includes('mechanics/hydrostatics'));
  assert.ok(slugs.includes('non-physics'));
  assert.equal(slugs.includes('mechanics/dynamics'), true);
  assert.equal(slugs.includes('mechanics/dynamics/friction'), false);
  assert.equal(slugs.includes('mechanics/kinematics/equation'), false);
  assert.equal(slugs.includes('non-physics/fortune-wheel'), false);
  assert.equal(slugs.includes('non-physics/summer-school-results'), false);
  assert.equal(slugs.includes('missing'), false);
});

test('empty state copy is ready for future simulations', () => {
  const kinematics = findNavItemByPath('/tools/mechanics/kinematics')!;
  assert.equal(
    getEmptyStateDescription(kinematics),
    'Здесь появятся интерактивные инструменты для изучения кинематики.',
  );
  assert.equal(formatCountLabel(0, 'симуляция', 'симуляции', 'симуляций'), '0 симуляций');
  assert.equal(formatCountLabel(1, 'раздел', 'раздела', 'разделов'), '1 раздел');
  assert.equal(formatCountLabel(2, 'инструмент', 'инструмента', 'инструментов'), '2 инструмента');
});

test('simulation number input allows empty draft without NaN', () => {
  assert.equal(parseSimulationNumberInput(''), null);
  assert.equal(parseSimulationNumberInput('   '), null);
  assert.equal(parseSimulationNumberInput('-'), null);
  assert.equal(parseSimulationNumberInput('.'), null);
  assert.equal(parseSimulationNumberInput('15'), 15);
  assert.equal(parseSimulationNumberInput('0.5'), 0.5);
  assert.equal(parseSimulationNumberInput('9.8'), 9.8);
  assert.equal(parseSimulationNumberInput('abc'), null);
  assert.equal(parseSimulationNumberInput('Infinity'), null);

  assert.equal(stepDecimals(0.1), 1);
  assert.equal(stepDecimals(1), 0);
  assert.equal(formatSimulationNumberInput(10.5, 1), '10.5');
  assert.equal(formatSimulationNumberInput(10, 1), '10');
  assert.equal(snapSimulationNumber(99, 1, 20, 0), 20);
  assert.equal(snapSimulationNumber(0.37, 0, 1, 2), 0.37);

  assert.equal(resolveSimulationNumberBlur('', 5, 1, 20, 0), 5);
  assert.equal(resolveSimulationNumberBlur('   ', 10, 1, 20, 0), 10);
  assert.equal(resolveSimulationNumberBlur('15', 5, 1, 20, 0), 15);
  assert.equal(resolveSimulationNumberBlur('0.5', 0.3, 0, 1, 2), 0.5);
  assert.equal(resolveSimulationNumberBlur('abc', 7, 1, 20, 0), 7);
  assert.equal(resolveSimulationNumberBlur('99', 5, 1, 20, 0), 20);
});

if (errors.length > 0) {
  console.error('verify-tools-library failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-tools-library passed (${passed} tests)`);
