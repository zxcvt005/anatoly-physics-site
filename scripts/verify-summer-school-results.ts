import assert from 'node:assert/strict';
import { toolsNavigation } from '../src/lib/tools/navigation';
import {
  SUMMER_SCHOOL_IMAGES,
  SUMMER_SCHOOL_PLACES,
  SUMMER_SCHOOL_WINNERS,
} from '../src/lib/tools/summer-school-results';

const errors: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

test('official winners are fixed in code', () => {
  assert.equal(SUMMER_SCHOOL_WINNERS.third, 'Елизавета Лисовская');
  assert.equal(SUMMER_SCHOOL_WINNERS.second, 'Владислава Ильичева');
  assert.equal(SUMMER_SCHOOL_WINNERS.first, 'Юлия Тарновская');
  assert.equal(SUMMER_SCHOOL_PLACES.third.winnerName, SUMMER_SCHOOL_WINNERS.third);
  assert.equal(SUMMER_SCHOOL_PLACES.second.winnerName, SUMMER_SCHOOL_WINNERS.second);
  assert.equal(SUMMER_SCHOOL_PLACES.first.winnerName, SUMMER_SCHOOL_WINNERS.first);
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
  assert.equal(children[0]?.path, '/tools/non-physics/fortune-wheel');
  assert.equal(children[1]?.id, 'summer-school-results');
  assert.equal(children[1]?.title, 'Итоги летней школы 2026');
  assert.equal(children[1]?.subtitle, 'Итоги летней школы 2026');
  assert.equal(children[1]?.path, '/tools/non-physics/summer-school-results');
});

if (errors.length > 0) {
  console.error('verify-summer-school-results failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-summer-school-results passed (${4} tests)`);
