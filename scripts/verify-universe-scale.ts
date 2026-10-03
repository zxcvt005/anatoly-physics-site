import assert from 'node:assert/strict';
import { SIZE_SCALE_OBJECTS } from '../src/lib/tools/size-scale/objects';
import {
  buildObjectWorldChain,
  cameraFromFocusMeters,
  formatRulerLength,
  formatSizeMeters,
  horizontalExtentMeters,
  imageDrawSize,
  imageTopForAlphaBaseline,
  log10Meters,
  nearestNiceLength,
  nearestObjectIndex,
  nearestObjectIndexByCamera,
  OBJECT_WORLD_CHAIN,
  objectScreenSizePx,
  objectVisualContentWidthPx,
  scaleLogBounds,
  stageBaselineY,
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

function testCatalog() {
  assert.equal(SIZE_SCALE_OBJECTS.length, 17);
  assert.equal(SIZE_SCALE_OBJECTS[0].id, 'proton');
  assert.equal(SIZE_SCALE_OBJECTS[0].sizeMeters, 1.68e-15);
  assert.equal(SIZE_SCALE_OBJECTS[1].id, 'atom');
  assert.equal(SIZE_SCALE_OBJECTS[1].sizeMeters, 5e-11);
  assert.equal(SIZE_SCALE_OBJECTS[16].id, 'sun');
  assert.equal(
    SIZE_SCALE_OBJECTS.some((object) => object.id === 'ton-618'),
    false,
  );
  assert.equal(
    SIZE_SCALE_OBJECTS.some((object) => object.id === 'milky-way'),
    false,
  );
  assert.equal(
    SIZE_SCALE_OBJECTS.some((object) => object.id === 'observable-universe'),
    false,
  );

  for (let index = 1; index < SIZE_SCALE_OBJECTS.length; index += 1) {
    assert.ok(
      SIZE_SCALE_OBJECTS[index].sizeMeters > SIZE_SCALE_OBJECTS[index - 1].sizeMeters,
    );
  }
}

function testPackedChainHasNoGapsOrOverlaps() {
  const chain = buildObjectWorldChain();
  assert.equal(chain.length, 17);
  assertClose(chain[0].worldLeft, 0);

  for (let index = 0; index < chain.length; index += 1) {
    const entry = chain[index];
    assert.equal(entry.id, SIZE_SCALE_OBJECTS[index].id);
    assertClose(entry.worldRight - entry.worldLeft, entry.horizontalMeters);
    if (index > 0) {
      assertClose(chain[index - 1].worldRight, entry.worldLeft, 1e-6);
    }
  }
}

function testHeightObjectsUseAspectForHorizontalSpan() {
  const burj = SIZE_SCALE_OBJECTS.find((object) => object.id === 'burj-khalifa')!;
  const everest = SIZE_SCALE_OBJECTS.find((object) => object.id === 'everest')!;
  const belaz = SIZE_SCALE_OBJECTS.find((object) => object.id === 'belaz-75710')!;

  const burjBox: ImageContentBox = {
    imageWidth: 1024,
    imageHeight: 1536,
    left: 360,
    top: 40,
    width: 280,
    height: 1450,
  };
  const everestBox: ImageContentBox = {
    imageWidth: 1536,
    imageHeight: 1024,
    left: 40,
    top: 180,
    width: 1450,
    height: 780,
  };
  const belazBox: ImageContentBox = {
    imageWidth: 1536,
    imageHeight: 1024,
    left: 30,
    top: 220,
    width: 1470,
    height: 700,
  };

  assertClose(horizontalExtentMeters(belaz, belazBox), belaz.sizeMeters);
  assertClose(
    horizontalExtentMeters(burj, burjBox),
    burj.sizeMeters * (burjBox.width / burjBox.height),
  );
  assert.ok(horizontalExtentMeters(burj, burjBox) < burj.sizeMeters);
  assertClose(
    horizontalExtentMeters(everest, everestBox),
    everest.sizeMeters * (everestBox.width / everestBox.height),
  );

  const boxes = new Map([
    [belaz.id, belazBox],
    [burj.id, burjBox],
    [everest.id, everestBox],
  ]);
  // Fill remaining with identity-like boxes so height objects elsewhere are stable.
  for (const object of SIZE_SCALE_OBJECTS) {
    if (!boxes.has(object.id)) {
      boxes.set(object.id, {
        imageWidth: 100,
        imageHeight: 100,
        left: 0,
        top: 0,
        width: 100,
        height: 100,
      });
    }
  }

  const chain = buildObjectWorldChain(SIZE_SCALE_OBJECTS, boxes);
  const belazWorld = chain.find((entry) => entry.id === 'belaz-75710')!;
  const burjWorld = chain.find((entry) => entry.id === 'burj-khalifa')!;
  const everestWorld = chain.find((entry) => entry.id === 'everest')!;

  assertClose(belazWorld.worldRight, burjWorld.worldLeft, 1e-6);
  assertClose(burjWorld.worldRight, everestWorld.worldLeft, 1e-6);

  const zoom = 0.4;
  const camera: SizeScaleCamera = { x: burjWorld.worldCenter, zoom };
  const stageWidth = 900;

  const belazRight =
    worldToScreenX(belazWorld.worldCenter, camera.x, stageWidth, zoom) +
    objectVisualContentWidthPx(belaz, belazBox, zoom) / 2;
  const burjLeft =
    worldToScreenX(burjWorld.worldCenter, camera.x, stageWidth, zoom) -
    objectVisualContentWidthPx(burj, burjBox, zoom) / 2;
  const burjRight =
    worldToScreenX(burjWorld.worldCenter, camera.x, stageWidth, zoom) +
    objectVisualContentWidthPx(burj, burjBox, zoom) / 2;
  const everestLeft =
    worldToScreenX(everestWorld.worldCenter, camera.x, stageWidth, zoom) -
    objectVisualContentWidthPx(everest, everestBox, zoom) / 2;

  assertClose(belazRight, burjLeft, 2);
  assertClose(burjRight, everestLeft, 2);
  assert.ok(Math.abs(belazRight - burjLeft) < 2);
  assert.ok(Math.abs(burjRight - everestLeft) < 2);
}

function testCameraDoesNotMutateWorld() {
  const chain = buildObjectWorldChain();
  const earth = chain.find((entry) => entry.id === 'earth')!;
  const before = { ...earth };
  cameraFromFocusMeters(earth.sizeMeters, 900, 600, chain);
  cameraFromFocusMeters(earth.sizeMeters * 10, 900, 600, chain);
  assertClose(chain.find((entry) => entry.id === 'earth')!.worldLeft, before.worldLeft);
}

function testUniformZoomPreservesRatios() {
  const moon = SIZE_SCALE_OBJECTS.find((object) => object.id === 'moon')!;
  const earth = SIZE_SCALE_OBJECTS.find((object) => object.id === 'earth')!;
  const jupiter = SIZE_SCALE_OBJECTS.find((object) => object.id === 'jupiter')!;
  const sun = SIZE_SCALE_OBJECTS.find((object) => object.id === 'sun')!;
  const chain = buildObjectWorldChain();
  const camera = cameraFromFocusMeters(earth.sizeMeters, 960, 680, chain);

  assertClose(camera.x, chain.find((entry) => entry.id === 'earth')!.worldCenter);

  const moonPx = objectScreenSizePx(moon.sizeMeters, camera.zoom);
  const earthPx = objectScreenSizePx(earth.sizeMeters, camera.zoom);
  const jupiterPx = objectScreenSizePx(jupiter.sizeMeters, camera.zoom);
  const sunPx = objectScreenSizePx(sun.sizeMeters, camera.zoom);

  assertClose(moonPx / earthPx, moon.sizeMeters / earth.sizeMeters, 1e-12);
  assertClose(jupiterPx / earthPx, jupiter.sizeMeters / earth.sizeMeters, 1e-12);
  assertClose(sunPx / earthPx, sun.sizeMeters / earth.sizeMeters, 1e-12);
}

function testSharedAlphaBaseline() {
  const baseline = stageBaselineY(680);
  assertClose(baseline, 680 * 0.82);

  const sphere: ImageContentBox = {
    imageWidth: 1000,
    imageHeight: 1000,
    left: 100,
    top: 50,
    width: 800,
    height: 900,
  };

  for (const scale of [0.5, 1, 2.4]) {
    const top = imageTopForAlphaBaseline(baseline, sphere, 0.2, scale);
    const visibleBottom = top + (sphere.top + sphere.height) * 0.2 * scale;
    assertClose(visibleBottom, baseline, 1e-9);
  }
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
}

function testLabels() {
  assert.equal(formatSizeMeters(1.6), '1,6 м');
  assert.equal(formatSizeMeters(1.2742e7), '12 742 км');
  assert.equal(formatSizeMeters(1.3927e9), '1,39 млн км');
  assert.equal(formatSizeMeters(1.68e-15), '1,68 фм');
  assert.equal(nearestNiceLength(1.6), 2);
  assert.match(formatRulerLength(1.6), /м/);
}

function testLogStillDrivesSliderNotWorld() {
  const bounds = scaleLogBounds();
  assert.ok(bounds.max - bounds.min > 20);
  assert.equal(nearestObjectIndex(log10Meters(1.2742e7)), 14);
  const chain = OBJECT_WORLD_CHAIN;
  const camera = cameraFromFocusMeters(1.2742e7, 900, 600, chain);
  assert.equal(nearestObjectIndexByCamera(camera, chain), 14);
  assert.ok(visibleObjectIndexes(camera, 900, 600, chain).includes(14));
}

testCatalog();
testPackedChainHasNoGapsOrOverlaps();
testHeightObjectsUseAspectForHorizontalSpan();
testCameraDoesNotMutateWorld();
testUniformZoomPreservesRatios();
testSharedAlphaBaseline();
testAspectRatio();
testLabels();
testLogStillDrivesSliderNotWorld();
console.log('verify-universe-scale: ok');
