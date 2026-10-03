import assert from 'node:assert/strict';
import { SIZE_SCALE_OBJECTS } from '../src/lib/tools/size-scale/objects';
import {
  buildObjectWorldChain,
  cameraFromFocusMeters,
  formatRulerLength,
  formatSizeMeters,
  imageDrawSize,
  log10Meters,
  nearestNiceLength,
  nearestObjectIndex,
  nearestObjectIndexByCamera,
  OBJECT_WORLD_BY_ID,
  OBJECT_WORLD_CHAIN,
  objectScreenSizePx,
  scaleLogBounds,
  visibleObjectIndexes,
  worldToScreenX,
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
  assert.equal(SIZE_SCALE_OBJECTS[13].id, 'moon');
  assert.equal(SIZE_SCALE_OBJECTS[14].id, 'earth');
  assert.equal(SIZE_SCALE_OBJECTS[15].id, 'jupiter');
  assert.equal(SIZE_SCALE_OBJECTS[16].id, 'sun');
  assert.equal(SIZE_SCALE_OBJECTS[19].sizeMeters, 8.8e26);

  for (let index = 1; index < SIZE_SCALE_OBJECTS.length; index += 1) {
    assert.ok(
      SIZE_SCALE_OBJECTS[index].sizeMeters > SIZE_SCALE_OBJECTS[index - 1].sizeMeters,
    );
  }
}

function testPackedChainHasNoGapsOrOverlaps() {
  assert.equal(OBJECT_WORLD_CHAIN.length, SIZE_SCALE_OBJECTS.length);
  assertClose(OBJECT_WORLD_CHAIN[0].worldLeft, 0);

  for (let index = 0; index < OBJECT_WORLD_CHAIN.length; index += 1) {
    const entry = OBJECT_WORLD_CHAIN[index];
    const object = SIZE_SCALE_OBJECTS[index];

    assert.equal(entry.id, object.id);
    assertClose(entry.worldRight - entry.worldLeft, object.sizeMeters);
    assertClose(entry.worldCenter, (entry.worldLeft + entry.worldRight) / 2);

    if (index > 0) {
      const previous = OBJECT_WORLD_CHAIN[index - 1];
      assertClose(previous.worldRight, entry.worldLeft, 1e-6);
      assert.ok(previous.worldRight <= entry.worldLeft + 1e-6);
      assert.ok(previous.worldLeft < entry.worldLeft);
    }
  }

  // Rebuild is deterministic and independent of the camera.
  const rebuilt = buildObjectWorldChain();
  for (let index = 0; index < rebuilt.length; index += 1) {
    assertClose(rebuilt[index].worldLeft, OBJECT_WORLD_CHAIN[index].worldLeft);
    assertClose(rebuilt[index].worldRight, OBJECT_WORLD_CHAIN[index].worldRight);
  }
}

function testCameraDoesNotMutateWorld() {
  const earth = OBJECT_WORLD_BY_ID.get('earth')!;
  const before = { ...earth };
  const cameraA = cameraFromFocusMeters(earth.sizeMeters, 900, 600);
  const cameraB = cameraFromFocusMeters(earth.sizeMeters * 10, 900, 600);

  assert.notEqual(cameraA.x, cameraB.x);
  assert.notEqual(cameraA.zoom, cameraB.zoom);
  assertClose(OBJECT_WORLD_BY_ID.get('earth')!.worldLeft, before.worldLeft);
  assertClose(OBJECT_WORLD_BY_ID.get('earth')!.worldRight, before.worldRight);
  assertClose(OBJECT_WORLD_BY_ID.get('earth')!.worldCenter, before.worldCenter);
}

function testNeighborsTouchOnScreenAtAnyZoom() {
  const moon = OBJECT_WORLD_BY_ID.get('moon')!;
  const earth = OBJECT_WORLD_BY_ID.get('earth')!;
  const jupiter = OBJECT_WORLD_BY_ID.get('jupiter')!;
  const sun = OBJECT_WORLD_BY_ID.get('sun')!;

  for (const zoom of [0.25, 0.5, 1, 2]) {
    const camera: SizeScaleCamera = { x: earth.worldCenter, zoom };
    const stageWidth = 900;

    const moonRight = worldToScreenX(moon.worldRight, camera.x, stageWidth, camera.zoom);
    const earthLeft = worldToScreenX(earth.worldLeft, camera.x, stageWidth, camera.zoom);
    const earthRight = worldToScreenX(earth.worldRight, camera.x, stageWidth, camera.zoom);
    const jupiterLeft = worldToScreenX(jupiter.worldLeft, camera.x, stageWidth, camera.zoom);
    const jupiterRight = worldToScreenX(jupiter.worldRight, camera.x, stageWidth, camera.zoom);
    const sunLeft = worldToScreenX(sun.worldLeft, camera.x, stageWidth, camera.zoom);

    assertClose(moonRight, earthLeft, 1e-6);
    assertClose(earthRight, jupiterLeft, 1e-6);
    assertClose(jupiterRight, sunLeft, 1e-6);

    assert.ok(moonRight <= earthLeft + 1e-6);
    assert.ok(earthRight <= jupiterLeft + 1e-6);
    assert.ok(jupiterRight <= sunLeft + 1e-6);
  }
}

function testUniformZoomPreservesRatios() {
  const moon = SIZE_SCALE_OBJECTS.find((object) => object.id === 'moon')!;
  const earth = SIZE_SCALE_OBJECTS.find((object) => object.id === 'earth')!;
  const jupiter = SIZE_SCALE_OBJECTS.find((object) => object.id === 'jupiter')!;
  const sun = SIZE_SCALE_OBJECTS.find((object) => object.id === 'sun')!;
  const camera = cameraFromFocusMeters(earth.sizeMeters, 960, 680);

  assertClose(camera.x, OBJECT_WORLD_BY_ID.get('earth')!.worldCenter);

  const moonPx = objectScreenSizePx(moon.sizeMeters, camera.zoom);
  const earthPx = objectScreenSizePx(earth.sizeMeters, camera.zoom);
  const jupiterPx = objectScreenSizePx(jupiter.sizeMeters, camera.zoom);
  const sunPx = objectScreenSizePx(sun.sizeMeters, camera.zoom);

  assertClose(moonPx / earthPx, moon.sizeMeters / earth.sizeMeters, 1e-12);
  assertClose(jupiterPx / earthPx, jupiter.sizeMeters / earth.sizeMeters, 1e-12);
  assertClose(sunPx / earthPx, sun.sizeMeters / earth.sizeMeters, 1e-12);
  assertClose(earthPx, earth.sizeMeters * camera.zoom);

  const halfZoom: SizeScaleCamera = { x: camera.x, zoom: camera.zoom / 2 };
  assertClose(
    objectScreenSizePx(earth.sizeMeters, halfZoom.zoom),
    earthPx / 2,
  );
  assertClose(
    objectScreenSizePx(jupiter.sizeMeters, halfZoom.zoom) /
      objectScreenSizePx(earth.sizeMeters, halfZoom.zoom),
    jupiter.sizeMeters / earth.sizeMeters,
    1e-12,
  );
}

function testPlanetaryOrderLeftToRight() {
  const camera = cameraFromFocusMeters(
    SIZE_SCALE_OBJECTS.find((object) => object.id === 'earth')!.sizeMeters,
    960,
    680,
  );
  const stageWidth = 960;
  const ids = ['moon', 'earth', 'jupiter', 'sun'] as const;
  const centers = ids.map((id) => {
    const world = OBJECT_WORLD_BY_ID.get(id)!;
    return worldToScreenX(world.worldCenter, camera.x, stageWidth, camera.zoom);
  });

  assert.ok(centers[0] < centers[1]);
  assert.ok(centers[1] < centers[2]);
  assert.ok(centers[2] < centers[3]);
}

function testContinuousTravelKeepsContact() {
  const earth = SIZE_SCALE_OBJECTS.find((object) => object.id === 'earth')!;
  const sun = SIZE_SCALE_OBJECTS.find((object) => object.id === 'sun')!;
  const start = log10Meters(earth.sizeMeters);
  const end = log10Meters(sun.sizeMeters);

  for (let step = 0; step <= 30; step += 1) {
    const log = start + ((end - start) * step) / 30;
    const camera = cameraFromFocusMeters(10 ** log, 960, 680);
    const moon = OBJECT_WORLD_BY_ID.get('moon')!;
    const earthWorld = OBJECT_WORLD_BY_ID.get('earth')!;
    const jupiter = OBJECT_WORLD_BY_ID.get('jupiter')!;

    assertClose(moon.worldRight, earthWorld.worldLeft, 1e-6);
    assertClose(earthWorld.worldRight, jupiter.worldLeft, 1e-6);

    const earthRight = worldToScreenX(earthWorld.worldRight, camera.x, 960, camera.zoom);
    const jupiterLeft = worldToScreenX(jupiter.worldLeft, camera.x, 960, camera.zoom);
    assertClose(earthRight, jupiterLeft, 1e-4);
  }
}

function testMicroMinimumOnlyAffectsDraw() {
  const zoom = cameraFromFocusMeters(1.6, 900, 600).zoom;
  assert.equal(objectScreenSizePx(1.68e-15, zoom), 8);
  // World geometry still uses the true physical diameter.
  assertClose(
    OBJECT_WORLD_CHAIN[0].worldRight - OBJECT_WORLD_CHAIN[0].worldLeft,
    1.68e-15,
  );
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
  assert.equal(formatSizeMeters(1.2742e7), '12 742 км');
  assert.equal(formatSizeMeters(1.3927e9), '1,39 млн км');
  assert.equal(formatSizeMeters(9.4607e20), '100 000 св. лет');
  assert.equal(formatRulerLength(8.8e26), '100 млрд св. лет');
  assert.equal(formatSizeMeters(1.68e-15), '1,68 фм');
  assert.equal(nearestNiceLength(1.6), 2);
}

function testLogStillDrivesSliderNotWorld() {
  const bounds = scaleLogBounds();
  assert.ok(bounds.max - bounds.min > 40);
  assert.equal(nearestObjectIndex(log10Meters(1.2742e7)), 14);

  const camera = cameraFromFocusMeters(1.2742e7, 900, 600);
  assert.equal(nearestObjectIndexByCamera(camera), 14);
  assert.ok(visibleObjectIndexes(camera, 900, 600).includes(14));
}

testOrderAndSizes();
testPackedChainHasNoGapsOrOverlaps();
testCameraDoesNotMutateWorld();
testNeighborsTouchOnScreenAtAnyZoom();
testUniformZoomPreservesRatios();
testPlanetaryOrderLeftToRight();
testContinuousTravelKeepsContact();
testMicroMinimumOnlyAffectsDraw();
testAspectRatio();
testLabels();
testLogStillDrivesSliderNotWorld();
console.log('verify-universe-scale: ok');
