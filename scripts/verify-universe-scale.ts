import assert from 'node:assert/strict';
import { SIZE_SCALE_OBJECTS } from '../src/lib/tools/size-scale/objects';
import {
  cameraFromFocusMeters,
  formatRulerLength,
  formatSizeMeters,
  imageDrawSize,
  log10Meters,
  nearestNiceLength,
  nearestObjectIndex,
  nearestObjectIndexByCamera,
  OBJECT_WORLD_X,
  objectScreenSizePx,
  pixelsPerWorldUnit,
  scaleLogBounds,
  visibleObjectIndexes,
  WORLD_UNITS_PER_DECADE,
  worldToScreenX,
  worldXForObject,
  worldXFromSizeMeters,
  type ImageContentBox,
  type SizeScaleCamera,
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

function testWorldPositionsAreFixedFromSizeOnly() {
  const earth = SIZE_SCALE_OBJECTS.find((object) => object.id === 'earth')!;
  const jupiter = SIZE_SCALE_OBJECTS.find((object) => object.id === 'jupiter')!;

  const earthX = worldXForObject(earth);
  const jupiterX = worldXForObject(jupiter);

  assertClose(earthX, log10Meters(earth.sizeMeters) * WORLD_UNITS_PER_DECADE);
  assertClose(
    jupiterX - earthX,
    (log10Meters(jupiter.sizeMeters) - log10Meters(earth.sizeMeters)) *
      WORLD_UNITS_PER_DECADE,
  );
  assert.equal(OBJECT_WORLD_X.get('earth'), earthX);

  // Camera must not mutate world coordinates.
  const cameraA = cameraFromFocusMeters(earth.sizeMeters, 900, 600);
  const cameraB = cameraFromFocusMeters(jupiter.sizeMeters, 900, 600);
  assert.notEqual(cameraA.x, cameraB.x);
  assert.equal(worldXForObject(earth), earthX);
  assert.equal(worldXFromSizeMeters(earth.sizeMeters), earthX);
}

function testCameraSeparatesPositionAndZoom() {
  const earth = SIZE_SCALE_OBJECTS.find((object) => object.id === 'earth')!;
  const camera = cameraFromFocusMeters(earth.sizeMeters, 900, 680);

  assertClose(camera.x, worldXForObject(earth));
  assert.ok(camera.zoom > 0);
  assertClose(earth.sizeMeters * camera.zoom, objectScreenSizePx(earth.sizeMeters, camera.zoom));

  const zoomedOut: SizeScaleCamera = { x: camera.x, zoom: camera.zoom / 2 };
  const moon = SIZE_SCALE_OBJECTS.find((object) => object.id === 'moon')!;
  const earthBefore = objectScreenSizePx(earth.sizeMeters, camera.zoom);
  const moonBefore = objectScreenSizePx(moon.sizeMeters, camera.zoom);
  const earthAfter = objectScreenSizePx(earth.sizeMeters, zoomedOut.zoom);
  const moonAfter = objectScreenSizePx(moon.sizeMeters, zoomedOut.zoom);

  assertClose(earthAfter / earthBefore, 0.5);
  assertClose(moonAfter / moonBefore, 0.5);
  assertClose(moonAfter / earthAfter, moonBefore / earthBefore);

  // Moving camera.x alone does not change sizes.
  const panned: SizeScaleCamera = { x: camera.x + 500, zoom: camera.zoom };
  assertClose(
    objectScreenSizePx(earth.sizeMeters, panned.zoom),
    objectScreenSizePx(earth.sizeMeters, camera.zoom),
  );
}

function testPlanetaryProportions() {
  const moon = SIZE_SCALE_OBJECTS.find((object) => object.id === 'moon')!;
  const earth = SIZE_SCALE_OBJECTS.find((object) => object.id === 'earth')!;
  const jupiter = SIZE_SCALE_OBJECTS.find((object) => object.id === 'jupiter')!;
  const sun = SIZE_SCALE_OBJECTS.find((object) => object.id === 'sun')!;
  const camera = cameraFromFocusMeters(earth.sizeMeters, 960, 680);

  const moonPx = objectScreenSizePx(moon.sizeMeters, camera.zoom);
  const earthPx = objectScreenSizePx(earth.sizeMeters, camera.zoom);
  const jupiterPx = objectScreenSizePx(jupiter.sizeMeters, camera.zoom);
  const sunPx = objectScreenSizePx(sun.sizeMeters, camera.zoom);

  assertClose(moonPx / earthPx, moon.sizeMeters / earth.sizeMeters, 1e-12);
  assertClose(jupiterPx / earthPx, jupiter.sizeMeters / earth.sizeMeters, 1e-12);
  assertClose(sunPx / earthPx, sun.sizeMeters / earth.sizeMeters, 1e-12);

  // No artificial floor for Moon and larger.
  const moonAtSun = objectScreenSizePx(
    moon.sizeMeters,
    cameraFromFocusMeters(sun.sizeMeters, 960, 680).zoom,
  );
  assert.ok(moonAtSun < 8);
}

function testScreenProjectionUsesFixedWorld() {
  const moon = SIZE_SCALE_OBJECTS.find((object) => object.id === 'moon')!;
  const earth = SIZE_SCALE_OBJECTS.find((object) => object.id === 'earth')!;
  const jupiter = SIZE_SCALE_OBJECTS.find((object) => object.id === 'jupiter')!;
  const sun = SIZE_SCALE_OBJECTS.find((object) => object.id === 'sun')!;
  const stageWidth = 900;
  const camera = cameraFromFocusMeters(earth.sizeMeters, stageWidth, 600);
  const pxPerWorld = pixelsPerWorldUnit(stageWidth);

  const moonX = worldToScreenX(worldXForObject(moon), camera.x, stageWidth, pxPerWorld);
  const earthX = worldToScreenX(worldXForObject(earth), camera.x, stageWidth, pxPerWorld);
  const jupiterX = worldToScreenX(worldXForObject(jupiter), camera.x, stageWidth, pxPerWorld);
  const sunX = worldToScreenX(worldXForObject(sun), camera.x, stageWidth, pxPerWorld);

  assertClose(earthX, stageWidth / 2);
  assert.ok(moonX < earthX);
  assert.ok(jupiterX > earthX);
  assert.ok(sunX > jupiterX);

  // Spacing follows log-size gaps, not equal carousel slots.
  const decadePx = pxPerWorld * WORLD_UNITS_PER_DECADE;
  assertClose(
    jupiterX - earthX,
    (log10Meters(jupiter.sizeMeters) - log10Meters(earth.sizeMeters)) * decadePx,
  );
  assertClose(
    sunX - jupiterX,
    (log10Meters(sun.sizeMeters) - log10Meters(jupiter.sizeMeters)) * decadePx,
  );
}

function testNoPositionBasedScale() {
  const earth = SIZE_SCALE_OBJECTS.find((object) => object.id === 'earth')!;
  const camera = cameraFromFocusMeters(earth.sizeMeters, 900, 600);
  const sizeAtCenter = objectScreenSizePx(earth.sizeMeters, camera.zoom);

  // Same zoom, different hypothetical screen positions — size unchanged.
  const left = worldToScreenX(worldXForObject(earth) - 2000, camera.x, 900, pixelsPerWorldUnit(900));
  const right = worldToScreenX(worldXForObject(earth) + 2000, camera.x, 900, pixelsPerWorldUnit(900));
  assert.notEqual(left, right);
  assertClose(objectScreenSizePx(earth.sizeMeters, camera.zoom), sizeAtCenter);
}

function testContinuousTravelEarthToSun() {
  const earth = SIZE_SCALE_OBJECTS.find((object) => object.id === 'earth')!;
  const jupiter = SIZE_SCALE_OBJECTS.find((object) => object.id === 'jupiter')!;
  const sun = SIZE_SCALE_OBJECTS.find((object) => object.id === 'sun')!;

  const start = log10Meters(earth.sizeMeters);
  const end = log10Meters(sun.sizeMeters);
  let sawJupiter = false;

  for (let step = 0; step <= 40; step += 1) {
    const log = start + ((end - start) * step) / 40;
    const camera = cameraFromFocusMeters(10 ** log, 960, 680);
    const visible = visibleObjectIndexes(camera, 960, 680).map(
      (index) => SIZE_SCALE_OBJECTS[index].id,
    );

    if (visible.includes('jupiter')) {
      sawJupiter = true;
    }

    // Uniform zoom: Jupiter/Earth ratio constant along the whole trip.
    const earthPx = objectScreenSizePx(earth.sizeMeters, camera.zoom);
    const jupiterPx = objectScreenSizePx(jupiter.sizeMeters, camera.zoom);
    assertClose(jupiterPx / earthPx, jupiter.sizeMeters / earth.sizeMeters, 1e-9);
  }

  assert.ok(sawJupiter);
  assert.equal(nearestObjectIndex(end), SIZE_SCALE_OBJECTS.findIndex((o) => o.id === 'sun'));

  // Sun stays visible near Earth; TON is culled as a far GPU giant, not shrunk.
  const atEarth = visibleObjectIndexes(
    cameraFromFocusMeters(earth.sizeMeters, 960, 680),
    960,
    680,
  ).map((index) => SIZE_SCALE_OBJECTS[index].id);
  assert.ok(atEarth.includes('sun'));
  assert.equal(atEarth.includes('ton-618'), false);

  const atSun = visibleObjectIndexes(
    cameraFromFocusMeters(sun.sizeMeters, 960, 680),
    960,
    680,
  ).map((index) => SIZE_SCALE_OBJECTS[index].id);
  assert.ok(atSun.includes('sun'));
  assert.ok(atSun.includes('jupiter'));
  assert.equal(atSun.includes('ton-618'), false);
}

function testMicroMinimumOnly() {
  const baseZoom = cameraFromFocusMeters(1.6, 900, 600).zoom;
  assert.equal(objectScreenSizePx(1.68e-15, baseZoom), 8);
  assert.ok(objectScreenSizePx(1.6, baseZoom) > 8);
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

function testLogScaleIsContinuous() {
  const grandmother = SIZE_SCALE_OBJECTS.find((object) => object.id === 'grandmother')!;
  const meteor = SIZE_SCALE_OBJECTS.find((object) => object.id === 'chelyabinsk-meteor')!;
  const midMeters = Math.sqrt(grandmother.sizeMeters * meteor.sizeMeters);
  const midLog = log10Meters(midMeters);

  assert.equal(nearestObjectIndex(log10Meters(grandmother.sizeMeters)), 8);
  assert.equal(nearestObjectIndex(midLog - 0.02), 8);
  assert.equal(nearestObjectIndex(midLog + 0.02), 9);

  const bounds = scaleLogBounds();
  assert.ok(bounds.max - bounds.min > 40);

  const camera = cameraFromFocusMeters(midMeters, 900, 600);
  assert.equal(nearestObjectIndexByCamera(camera), nearestObjectIndex(midLog));
}

testOrderAndSizes();
testWorldPositionsAreFixedFromSizeOnly();
testCameraSeparatesPositionAndZoom();
testPlanetaryProportions();
testScreenProjectionUsesFixedWorld();
testNoPositionBasedScale();
testContinuousTravelEarthToSun();
testMicroMinimumOnly();
testAspectRatio();
testLabels();
testLogScaleIsContinuous();
console.log('verify-universe-scale: ok');
