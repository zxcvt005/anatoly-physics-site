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

test('molecular physics uses MKT as the subsection title', () => {
  const molecular = toolsNavigation.find((item) => item.id === 'molecular');
  const mkt = molecular?.children?.find((child) => child.id === 'mkt');
  assert.equal(mkt?.title, 'МКТ');
  assert.equal(mkt?.path, '/tools/molecular/mkt');
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

test('physics subsections currently have zero simulations', () => {
  const subsections = flattenToolsNavigation().filter(
    (item) => item.type === 'subsection',
  );
  assert.ok(subsections.length > 0);

  for (const item of subsections) {
    assert.equal(getSimulationCount(item), 0);
    assert.equal(getChildCardMeta(item), '0 симуляций');
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

test('existing non-physics tool routes are preserved', () => {
  assert.deepEqual([...DEDICATED_TOOL_PATHS], [
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

test('valid paths resolve and invalid paths do not', () => {
  assert.equal(isToolsHome('/tools'), true);
  assert.equal(isToolsHome('/tools/'), true);
  assert.equal(isValidToolsPath('/tools'), true);
  assert.equal(isValidToolsPath('/tools/mechanics'), true);
  assert.equal(isValidToolsPath('/tools/mechanics/kinematics'), true);
  assert.equal(isValidToolsPath('/tools/mechanics/hydrostatics'), true);
  assert.equal(isValidToolsPath('/tools/non-physics/fortune-wheel'), true);
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
  assert.equal(shouldExpandNavItem(mechanics, '/tools/optics'), false);
  assert.equal(findParentNavItem('/tools/mechanics/kinematics')?.id, 'mechanics');
});

test('catch-all static slugs include library pages but not dedicated tools', () => {
  const slugs = getCatchAllStaticSlugs().map((parts) => parts.join('/'));

  assert.ok(slugs.includes('mechanics'));
  assert.ok(slugs.includes('mechanics/kinematics'));
  assert.ok(slugs.includes('mechanics/hydrostatics'));
  assert.ok(slugs.includes('non-physics'));
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

if (errors.length > 0) {
  console.error('verify-tools-library failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-tools-library passed (${passed} tests)`);
