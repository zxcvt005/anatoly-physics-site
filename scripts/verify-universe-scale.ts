import assert from 'node:assert/strict';
import { SIZE_SCALE_OBJECTS } from '../src/lib/tools/size-scale/objects';
import {
  formatRulerLength,
  formatSizeMeters,
  imageDrawSize,
  log10Meters,
  nearestNiceLength,
  nearestObjectIndex,
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

  const approaching = visualCharacteristicPixels(20, 1.6, base);
  assertClose(approaching, base * (1.6 / 20));
  assert.ok(approaching < atFocus);

  const tiny = visualCharacteristicPixels(1.68e-15, 1.6, base);
  assert.equal(tiny, 8);
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
  const visible = visibleObjectIndexes(mid).map((index) => SIZE_SCALE_OBJECTS[index].id);

  assert.ok(visible.includes('ton-618'));
  assert.ok(visible.includes('milky-way'));
}

testOrderAndSizes();
testLogScaleIsContinuous();
testVisualSizeUsesMetersNotPixels();
testAspectRatio();
testLabels();
testNeighborsStayVisibleAcrossTheLargestGap();
console.log('verify-universe-scale: ok');
