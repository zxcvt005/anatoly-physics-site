import assert from 'node:assert/strict';
import { SIZE_SCALE_OBJECTS } from '../src/lib/tools/size-scale/objects';
import {
  formatRulerLength,
  formatSizeMeters,
  imageDrawSize,
  log10Meters,
  nearestNiceLength,
  nearestObjectIndex,
  objectScreenX,
  pixelsPerLogDecade,
  scaleLogBounds,
  visibleObjectIndexes,
  visualCharacteristicPixels,
  type ImageContentBox,
} from '../src/lib/tools/size-scale/scale';

function assertClose(actual: number, expected: number, epsilon = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${actual} is not close to ${expected}`,
  );
}

function testOrderAndSizes() {
  assert.equal(SIZE_SCALE_OBJECTS.length, 20);
  assert.equal(SIZE_SCALE_OBJECTS[0].id, 'proton');
  assert.equal(SIZE_SCALE_OBJECTS[0].sizeMeters, 1.68e-15);
  assert.equal(SIZE_SCALE_OBJECTS[17].id, 'ton-618');
  assert.equal(SIZE_SCALE_OBJECTS[17].sizeMeters, 3.9e14);
  assert.equal(SIZE_SCALE_OBJECTS[19].sizeMeters, 8.8e26);

  for (let index = 1; index < SIZE_SCALE_OBJECTS.length; index += 1) {
    assert.ok(
      SIZE_SCALE_OBJECTS[index].sizeMeters > SIZE_SCALE_OBJECTS[index - 1].sizeMeters,
    );
  }
}

function testLogScaleIsContinuous() {
  const grandmother = SIZE_SCALE_OBJECTS.find((object) => object.id === 'grandmother')!;
  const meteor = SIZE_SCALE_OBJECTS.find((object) => object.id === 'chelyabinsk-meteor')!;
  const midMeters = Math.sqrt(grandmother.sizeMeters * meteor.sizeMeters);
  const midLog = log10Meters(midMeters);

  assert.ok(midMeters > grandmother.sizeMeters);
  assert.ok(midMeters < meteor.sizeMeters);
  assert.equal(nearestObjectIndex(log10Meters(grandmother.sizeMeters)), 8);
  assert.equal(nearestObjectIndex(midLog - 0.02), 8);
  assert.equal(nearestObjectIndex(midLog + 0.02), 9);

  const bounds = scaleLogBounds();
  assert.ok(bounds.max - bounds.min > 40);
}

function testVisualSizeUsesMetersNotPixels() {
  const base = 280;
  const atFocus = visualCharacteristicPixels(1.6, 1.6, base);
  assertClose(atFocus, base);

  const smaller = visualCharacteristicPixels(1.6, 20, base);
  assertClose(smaller, base * (1.6 / 20));

  // Larger object at a smaller camera scale must already be physically larger —
  // never inverted into a growing "preview".
  const larger = visualCharacteristicPixels(20, 1.6, base);
  assertClose(larger, base * (20 / 1.6));
  assert.ok(larger > atFocus);

  const tiny = visualCharacteristicPixels(1.68e-15, 1.6, base);
  assert.equal(tiny, 8);
}

function testPlanetaryProportionsAtEarthScale() {
  const moon = SIZE_SCALE_OBJECTS.find((object) => object.id === 'moon')!;
  const earth = SIZE_SCALE_OBJECTS.find((object) => object.id === 'earth')!;
  const jupiter = SIZE_SCALE_OBJECTS.find((object) => object.id === 'jupiter')!;
  const sun = SIZE_SCALE_OBJECTS.find((object) => object.id === 'sun')!;
  const base = 100;
  const scale = earth.sizeMeters;

  const moonPx = visualCharacteristicPixels(moon.sizeMeters, scale, base);
  const earthPx = visualCharacteristicPixels(earth.sizeMeters, scale, base);
  const jupiterPx = visualCharacteristicPixels(jupiter.sizeMeters, scale, base);
  const sunPx = visualCharacteristicPixels(sun.sizeMeters, scale, base);

  assertClose(earthPx, base);
  assertClose(moonPx / earthPx, moon.sizeMeters / earth.sizeMeters, 1e-12);
  assertClose(jupiterPx / earthPx, jupiter.sizeMeters / earth.sizeMeters, 1e-12);
  assertClose(sunPx / earthPx, sun.sizeMeters / earth.sizeMeters, 1e-12);

  // No artificial floor for Moon and larger, even when far below camera scale.
  const moonAtSun = visualCharacteristicPixels(moon.sizeMeters, sun.sizeMeters, base);
  assertClose(moonAtSun, base * (moon.sizeMeters / sun.sizeMeters), 1e-12);
  assert.ok(moonAtSun < 8);
}

function testCompactLogPositions() {
  const moon = SIZE_SCALE_OBJECTS.find((object) => object.id === 'moon')!;
  const earth = SIZE_SCALE_OBJECTS.find((object) => object.id === 'earth')!;
  const jupiter = SIZE_SCALE_OBJECTS.find((object) => object.id === 'jupiter')!;
  const sun = SIZE_SCALE_OBJECTS.find((object) => object.id === 'sun')!;
  const stageWidth = 900;
  const pixelsPerDecade = pixelsPerLogDecade(stageWidth);
  const currentLog = log10Meters(earth.sizeMeters);
  const center = stageWidth / 2;

  assert.ok(pixelsPerDecade <= 168);
  assert.ok(pixelsPerDecade >= 96);

  const moonX = objectScreenX(log10Meters(moon.sizeMeters), currentLog, stageWidth, pixelsPerDecade);
  const earthX = objectScreenX(log10Meters(earth.sizeMeters), currentLog, stageWidth, pixelsPerDecade);
  const jupiterX = objectScreenX(
    log10Meters(jupiter.sizeMeters),
    currentLog,
    stageWidth,
    pixelsPerDecade,
  );
  const sunX = objectScreenX(log10Meters(sun.sizeMeters), currentLog, stageWidth, pixelsPerDecade);

  assertClose(earthX, center);
  assert.ok(moonX < earthX);
  assert.ok(jupiterX > earthX);
  assert.ok(sunX > jupiterX);

  // Neighbors stay in one compact scene around Earth.
  assert.ok(center - moonX < stageWidth * 0.22);
  assert.ok(jupiterX - center < stageWidth * 0.28);
  assert.ok(sunX - center < stageWidth * 0.45);

  const visible = visibleObjectIndexes(currentLog).map(
    (index) => SIZE_SCALE_OBJECTS[index].id,
  );
  assert.ok(visible.includes('moon'));
  assert.ok(visible.includes('earth'));
  assert.ok(visible.includes('jupiter'));
  assert.ok(visible.includes('sun'));
}

function testAspectRatio() {
  const tall: ImageContentBox = {
    imageWidth: 1000,
    imageHeight: 1500,
    left: 100,
    top: 50,
    width: 800,
    height: 1400,
  };
  const wide: ImageContentBox = {
    imageWidth: 1600,
    imageHeight: 600,
    left: 0,
    top: 0,
    width: 1600,
    height: 600,
  };
  const tallDraw = imageDrawSize(tall, 140, 'height');
  const wideDraw = imageDrawSize(wide, 140, 'length');

  assertClose(tallDraw.width / tallDraw.height, 1000 / 1500);
  assertClose(wideDraw.width / wideDraw.height, 1600 / 600);
  assert.notEqual(tallDraw.width, wideDraw.width);
  assertClose(tallDraw.height, 140 * (1500 / 1400));
}

function testLabels() {
  assert.equal(formatSizeMeters(1.6), '1,6 м');
  assert.equal(formatSizeMeters(20.6), '20,6 м');
  assert.equal(formatSizeMeters(828), '828 м');
  assert.equal(formatSizeMeters(8848.86), '8,85 км');
  assert.equal(formatSizeMeters(1.2742e7), '12 742 км');
  assert.equal(formatSizeMeters(1.3927e9), '1,39 млн км');
  assert.equal(formatSizeMeters(9.4607e20), '100 000 св. лет');
  assert.equal(formatSizeMeters(8.8e26), '93 млрд св. лет');
  assert.equal(formatRulerLength(8.8e26), '100 млрд св. лет');
  assert.equal(formatSizeMeters(1.68e-15), '1,68 фм');
  assert.equal(nearestNiceLength(1.6), 2);
  assert.match(formatRulerLength(1.6), /м/);
}

function testNeighborsStayVisibleAcrossTheLargestGap() {
  const ton = SIZE_SCALE_OBJECTS.find((object) => object.id === 'ton-618')!;
  const galaxy = SIZE_SCALE_OBJECTS.find((object) => object.id === 'milky-way')!;
  const mid = (log10Meters(ton.sizeMeters) + log10Meters(galaxy.sizeMeters)) / 2;
  const atMid = visibleObjectIndexes(mid).map((index) => SIZE_SCALE_OBJECTS[index].id);

  // Midpoint is ~3 decades from each; the galaxy would be ~1500× the camera and is deferred.
  assert.ok(atMid.includes('ton-618'));
  assert.equal(atMid.includes('milky-way'), false);

  const approachLog = log10Meters(galaxy.sizeMeters) - Math.log10(120);
  const approaching = visibleObjectIndexes(approachLog).map(
    (index) => SIZE_SCALE_OBJECTS[index].id,
  );
  assert.ok(approaching.includes('milky-way'));
}

function testExtremeGiantsDoNotPaintOverFocus() {
  const grandmother = SIZE_SCALE_OBJECTS.find((object) => object.id === 'grandmother')!;
  const visible = visibleObjectIndexes(log10Meters(grandmother.sizeMeters)).map(
    (index) => SIZE_SCALE_OBJECTS[index].id,
  );

  assert.ok(visible.includes('grandmother'));
  assert.ok(visible.includes('chelyabinsk-meteor'));
  assert.equal(visible.includes('burj-khalifa'), false);
  assert.equal(visible.includes('everest'), false);

  const earth = SIZE_SCALE_OBJECTS.find((object) => object.id === 'earth')!;
  const atEarth = visibleObjectIndexes(log10Meters(earth.sizeMeters)).map(
    (index) => SIZE_SCALE_OBJECTS[index].id,
  );
  assert.ok(atEarth.includes('sun'));
}

testOrderAndSizes();
testLogScaleIsContinuous();
testVisualSizeUsesMetersNotPixels();
testPlanetaryProportionsAtEarthScale();
testCompactLogPositions();
testAspectRatio();
testLabels();
testNeighborsStayVisibleAcrossTheLargestGap();
testExtremeGiantsDoNotPaintOverFocus();
console.log('verify-universe-scale: ok');
