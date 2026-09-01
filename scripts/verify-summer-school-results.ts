import assert from 'node:assert/strict';
import { toolsNavigation } from '../src/lib/tools/navigation';
import {
  DEFAULT_SUMMER_SCHOOL_RESULTS,
  getPlaceName,
  isPlaceRevealed,
  parseSummerSchoolResults,
  serializeSummerSchoolResults,
  SUMMER_SCHOOL_IMAGES,
  SUMMER_SCHOOL_PLACES,
  SUMMER_SCHOOL_RESULTS_STORAGE_KEY,
} from '../src/lib/tools/summer-school-results';

const errors: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

test('storage key is summer-school-results', () => {
  assert.equal(SUMMER_SCHOOL_RESULTS_STORAGE_KEY, 'summer-school-results');
});

test('empty storage returns defaults', () => {
  const parsed = parseSummerSchoolResults(null);
  assert.deepEqual(parsed, DEFAULT_SUMMER_SCHOOL_RESULTS);
  assert.equal(parsed.thirdPlaceName, '');
  assert.equal(parsed.secondPlaceName, '');
  assert.equal(parsed.firstPlaceName, '');
  assert.equal(parsed.thirdPlaceRevealed, false);
  assert.equal(parsed.settingsHidden, false);
});

test('invalid json returns defaults', () => {
  assert.deepEqual(parseSummerSchoolResults('{not-json'), DEFAULT_SUMMER_SCHOOL_RESULTS);
});

test('parses stored names and reveal flags', () => {
  const parsed = parseSummerSchoolResults(
    JSON.stringify({
      thirdPlaceName: '  Анна  ',
      secondPlaceName: 'Борис',
      firstPlaceName: 'Кира',
      thirdPlaceRevealed: true,
      secondPlaceRevealed: false,
      firstPlaceRevealed: true,
      settingsHidden: true,
    }),
  );

  assert.equal(parsed.thirdPlaceName, 'Анна');
  assert.equal(parsed.secondPlaceName, 'Борис');
  assert.equal(parsed.firstPlaceName, 'Кира');
  assert.equal(parsed.thirdPlaceRevealed, true);
  assert.equal(parsed.secondPlaceRevealed, false);
  assert.equal(parsed.firstPlaceRevealed, true);
  assert.equal(parsed.settingsHidden, true);
});

test('revealed is false when name is empty', () => {
  const parsed = parseSummerSchoolResults(
    JSON.stringify({
      thirdPlaceName: '   ',
      thirdPlaceRevealed: true,
    }),
  );

  assert.equal(parsed.thirdPlaceName, '');
  assert.equal(parsed.thirdPlaceRevealed, false);
});

test('serialize roundtrip keeps names and reveal state', () => {
  const raw = serializeSummerSchoolResults({
    thirdPlaceName: ' Анна ',
    secondPlaceName: 'Борис',
    firstPlaceName: 'Кира',
    thirdPlaceRevealed: true,
    secondPlaceRevealed: true,
    firstPlaceRevealed: false,
    settingsHidden: true,
  });
  const parsed = parseSummerSchoolResults(raw);

  assert.equal(parsed.thirdPlaceName, 'Анна');
  assert.equal(parsed.secondPlaceName, 'Борис');
  assert.equal(parsed.firstPlaceName, 'Кира');
  assert.equal(parsed.thirdPlaceRevealed, true);
  assert.equal(parsed.secondPlaceRevealed, true);
  assert.equal(parsed.firstPlaceRevealed, false);
  assert.equal(parsed.settingsHidden, true);
});

test('place helpers read the right fields', () => {
  const state = parseSummerSchoolResults(
    JSON.stringify({
      thirdPlaceName: 'Анна',
      secondPlaceName: 'Борис',
      firstPlaceName: 'Кира',
      thirdPlaceRevealed: true,
      firstPlaceRevealed: true,
    }),
  );

  assert.equal(getPlaceName(state, 'third'), 'Анна');
  assert.equal(getPlaceName(state, 'second'), 'Борис');
  assert.equal(getPlaceName(state, 'first'), 'Кира');
  assert.equal(isPlaceRevealed(state, 'third'), true);
  assert.equal(isPlaceRevealed(state, 'second'), false);
  assert.equal(isPlaceRevealed(state, 'first'), true);
});

test('image paths are under public/images/summer-school', () => {
  assert.equal(SUMMER_SCHOOL_IMAGES.alice, '/images/summer-school/alice.png');
  assert.equal(
    SUMMER_SCHOOL_IMAGES.wildberries,
    '/images/summer-school/wildberries.png',
  );
  assert.equal(
    SUMMER_SCHOOL_IMAGES.educationCertificate,
    '/images/summer-school/education-certificate.png',
  );
  assert.equal(SUMMER_SCHOOL_IMAGES.ipad, '/images/summer-school/ipad.png');
});

test('place copy matches the presentation scenario', () => {
  assert.equal(SUMMER_SCHOOL_PLACES.third.rank, '03');
  assert.equal(SUMMER_SCHOOL_PLACES.third.title, 'ТРЕТЬЕ МЕСТО');
  assert.equal(SUMMER_SCHOOL_PLACES.third.prizeName, 'Колонка Алиса');
  assert.equal(SUMMER_SCHOOL_PLACES.second.rank, '02');
  assert.equal(SUMMER_SCHOOL_PLACES.second.title, 'ВТОРОЕ МЕСТО');
  assert.equal(SUMMER_SCHOOL_PLACES.second.prizeSubtitle, '10 000 ₽');
  assert.equal(SUMMER_SCHOOL_PLACES.first.rank, '01');
  assert.equal(SUMMER_SCHOOL_PLACES.first.title, 'ПЕРВОЕ МЕСТО');
  assert.equal(SUMMER_SCHOOL_PLACES.first.prizeName, '3 МЕСЯЦА');
  assert.equal(SUMMER_SCHOOL_PLACES.first.prizeSubtitle, 'БЕСПЛАТНОГО ОБУЧЕНИЯ');
});

test('navigation includes summer school results under non-physics', () => {
  const nonPhysics = toolsNavigation.find((item) => item.id === 'non-physics');
  assert.ok(nonPhysics);
  const children = nonPhysics?.children ?? [];
  assert.equal(children[0]?.id, 'fortune-wheel');
  assert.equal(children[0]?.href, '/tools/non-physics/fortune-wheel');
  assert.equal(children[1]?.id, 'summer-school-results');
  assert.equal(children[1]?.label, 'Итоги летней школы');
  assert.equal(children[1]?.href, '/tools/non-physics/summer-school-results');
});

if (errors.length > 0) {
  console.error('verify-summer-school-results failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-summer-school-results passed (${10} tests)`);
