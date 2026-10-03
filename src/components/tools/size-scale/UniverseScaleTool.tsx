'use client';

import { useEffect, useRef, useState } from 'react';
import {
  anchorKind,
  dimensionLabel,
  SIZE_SCALE_OBJECTS,
  type SizeScaleObject,
} from '@/lib/tools/size-scale/objects';
import {
  cameraFromFocusMeters,
  clampScaleLog,
  formatRulerLength,
  formatSizeMeters,
  imageDrawSize,
  log10Meters,
  metersFromLog,
  nearestObjectIndex,
  OBJECT_WORLD_X,
  objectScreenSizePx,
  pixelsPerWorldUnit,
  scaleLogBounds,
  visibleObjectIndexes,
  WORLD_UNITS_PER_DECADE,
  worldToScreenX,
  worldXForObject,
  type ImageContentBox,
  type SizeScaleCamera,
} from '@/lib/tools/size-scale/scale';

const BOUNDS = scaleLogBounds();
const INITIAL_LOG = log10Meters(
  SIZE_SCALE_OBJECTS.find((object) => object.id === 'grandmother')?.sizeMeters ??
    SIZE_SCALE_OBJECTS[0].sizeMeters,
);

type HudState = {
  objectId: string;
  name: string;
  sizeLabel: string;
  dimension: string;
  scaleLabel: string;
  rulerLabel: string;
  percent: number;
};

function fullImageBox(width: number, height: number): ImageContentBox {
  return {
    imageWidth: width,
    imageHeight: height,
    left: 0,
    top: 0,
    width,
    height,
  };
}

function measureAlphaBox(image: CanvasImageSource & {
  naturalWidth?: number;
  width: number;
  height: number;
}): ImageContentBox {
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight =
    'naturalHeight' in image && typeof image.naturalHeight === 'number'
      ? image.naturalHeight
      : image.height;

  if (!naturalWidth || !naturalHeight) {
    return fullImageBox(1, 1);
  }

  const maxSide = 720;
  const sampleScale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * sampleScale));
  const height = Math.max(1, Math.round(naturalHeight * sampleScale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    return fullImageBox(naturalWidth, naturalHeight);
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] <= 16) {
      continue;
    }

    const pixel = (index - 3) / 4;
    const x = pixel % width;
    const y = (pixel - x) / width;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  if (maxX < 0) {
    return fullImageBox(naturalWidth, naturalHeight);
  }

  return {
    imageWidth: naturalWidth,
    imageHeight: naturalHeight,
    left: minX / sampleScale,
    top: minY / sampleScale,
    width: (maxX - minX + 1) / sampleScale,
    height: (maxY - minY + 1) / sampleScale,
  };
}

function initialHud(): HudState {
  const object =
    SIZE_SCALE_OBJECTS.find((item) => item.id === 'grandmother') ??
    SIZE_SCALE_OBJECTS[0];
  const percent = (INITIAL_LOG - BOUNDS.min) / (BOUNDS.max - BOUNDS.min);

  return {
    objectId: object.id,
    name: object.name,
    sizeLabel: formatSizeMeters(object.sizeMeters),
    dimension: dimensionLabel(object.displayDimension),
    scaleLabel: formatSizeMeters(metersFromLog(INITIAL_LOG)),
    rulerLabel: formatRulerLength(metersFromLog(INITIAL_LOG)),
    percent,
  };
}

export function UniverseScaleTool() {
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const focusLogRef = useRef(INITIAL_LOG);
  const targetLogRef = useRef(INITIAL_LOG);
  const sliderDragRef = useRef(false);
  const nodesRef = useRef(new Map<string, HTMLImageElement>());
  const boundsRef = useRef(new Map<string, ImageContentBox>());
  const loadingRef = useRef(new Set<string>());
  const [hud, setHud] = useState<HudState>(initialHud);

  useEffect(() => {
    const stage = stageRef.current;
    const layer = layerRef.current;
    const slider = sliderRef.current;

    if (!stage || !layer || !slider) {
      return;
    }

    const stageNode = stage;
    const layerNode = layer;
    const sliderNode = slider;

    const nodes = nodesRef.current;
    const bounds = boundsRef.current;
    const loading = loadingRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let stopped = false;
    let hudKey = '';

    const touchDrag = {
      active: false,
      pointerId: -1,
      lastY: 0,
      lastLog: INITIAL_LOG,
      velocity: 0,
    };

    function rememberBox(object: SizeScaleObject, image: HTMLImageElement) {
      if (!image.naturalWidth) {
        return;
      }

      bounds.set(object.id, measureAlphaBox(image));
    }

    function preload(index: number) {
      const object = SIZE_SCALE_OBJECTS[index];
      if (!object || bounds.has(object.id) || loading.has(object.id) || nodes.has(object.id)) {
        return;
      }

      loading.add(object.id);
      const image = new Image();
      image.decoding = 'async';
      image.src = object.image;
      image.onload = () => {
        if (stopped) {
          return;
        }

        bounds.set(object.id, measureAlphaBox(image));
        loading.delete(object.id);
      };
    }

    function ensureNode(object: SizeScaleObject) {
      const existing = nodes.get(object.id);
      if (existing) {
        return existing;
      }

      const image = document.createElement('img');
      image.alt = object.name;
      image.draggable = false;
      image.decoding = 'async';
      image.src = object.image;
      image.style.position = 'absolute';
      image.style.left = '0';
      image.style.top = '0';
      image.style.pointerEvents = 'none';
      image.style.userSelect = 'none';
      image.style.maxWidth = 'none';
      image.style.opacity = '0';
      image.style.willChange = 'transform';
      layerNode.appendChild(image);
      nodes.set(object.id, image);
      loading.delete(object.id);

      if (image.complete && image.naturalWidth) {
        rememberBox(object, image);
      } else {
        image.onload = () => {
          if (!stopped) {
            rememberBox(object, image);
          }
        };
      }

      return image;
    }

    function placeObject(
      object: SizeScaleObject,
      image: HTMLImageElement,
      stageWidth: number,
      stageHeight: number,
      camera: SizeScaleCamera,
      pxPerWorld: number,
    ) {
      const box =
        bounds.get(object.id) ??
        (image.naturalWidth
          ? fullImageBox(image.naturalWidth, image.naturalHeight)
          : null);

      if (!box) {
        image.style.opacity = '0';
        return;
      }

      const worldX = OBJECT_WORLD_X.get(object.id) ?? worldXForObject(object);
      const screenX = worldToScreenX(worldX, camera.x, stageWidth, pxPerWorld);
      const characteristicPx = objectScreenSizePx(object.sizeMeters, camera.zoom);

      // Bound DOM texture size; true visual size preserved via transform scale.
      const maxLayoutPx = Math.max(stageWidth, stageHeight) * 2.75;
      const layoutCharacteristic = Math.min(characteristicPx, maxLayoutPx);
      const draw = imageDrawSize(box, layoutCharacteristic, object.displayDimension);
      const layoutScale = draw.width / box.imageWidth;
      const visualScale = characteristicPx / Math.max(layoutCharacteristic, 1e-9);

      let left = 0;
      let top = 0;

      if (anchorKind(object.displayDimension) === 'base') {
        const anchorX = (box.left + box.width / 2) * layoutScale * visualScale;
        const anchorY = (box.top + box.height) * layoutScale * visualScale;
        left = screenX - anchorX;
        top = stageHeight * 0.8 - anchorY;
      } else {
        const anchorX = (box.left + box.width / 2) * layoutScale * visualScale;
        const anchorY = (box.top + box.height / 2) * layoutScale * visualScale;
        left = screenX - anchorX;
        top = stageHeight * 0.46 - anchorY;
      }

      const focusLog = camera.x / WORLD_UNITS_PER_DECADE;
      const objectLog = log10Meters(object.sizeMeters);
      const decadeDistance = Math.abs(objectLog - focusLog);
      const opacity =
        decadeDistance <= 1.25
          ? 1
          : Math.max(0.42, 1 - (decadeDistance - 1.25) / 3.4);

      image.style.width = `${draw.width}px`;
      image.style.height = `${draw.height}px`;
      image.style.transformOrigin = '0 0';
      image.style.transform =
        visualScale === 1
          ? `translate3d(${left}px, ${top}px, 0)`
          : `translate3d(${left}px, ${top}px, 0) scale(${visualScale})`;
      image.style.opacity = String(opacity);
      image.style.zIndex = String(Math.round(80 - decadeDistance * 24));
    }

    function publishHud(focusLog: number) {
      const meters = metersFromLog(focusLog);
      const index = nearestObjectIndex(focusLog);
      const object = SIZE_SCALE_OBJECTS[index];
      const percent = (focusLog - BOUNDS.min) / (BOUNDS.max - BOUNDS.min);
      const key = [
        object.id,
        formatSizeMeters(meters),
        formatRulerLength(meters),
        Math.round(percent * 400),
      ].join('|');

      if (key === hudKey) {
        return;
      }

      hudKey = key;
      setHud({
        objectId: object.id,
        name: object.name,
        sizeLabel: formatSizeMeters(object.sizeMeters),
        dimension: dimensionLabel(object.displayDimension),
        scaleLabel: formatSizeMeters(meters),
        rulerLabel: formatRulerLength(meters),
        percent,
      });
    }

    function render() {
      const rect = stageNode.getBoundingClientRect();
      const stageWidth = rect.width;
      const stageHeight = rect.height;

      if (stageWidth < 2 || stageHeight < 2) {
        return;
      }

      const focusLog = focusLogRef.current;
      const focusMeters = metersFromLog(focusLog);
      const camera = cameraFromFocusMeters(focusMeters, stageWidth, stageHeight);
      const pxPerWorld = pixelsPerWorldUnit(stageWidth);
      const indexes = visibleObjectIndexes(camera, stageWidth, stageHeight);
      const visibleIds = new Set(indexes.map((index) => SIZE_SCALE_OBJECTS[index].id));

      for (const [id, image] of nodes) {
        if (!visibleIds.has(id)) {
          image.remove();
          nodes.delete(id);
        }
      }

      for (const index of indexes) {
        const object = SIZE_SCALE_OBJECTS[index];
        const image = ensureNode(object);
        placeObject(object, image, stageWidth, stageHeight, camera, pxPerWorld);
        preload(index - 1);
        preload(index + 1);
      }

      if (!sliderDragRef.current) {
        sliderNode.value = String(focusLog);
      }

      publishHud(focusLog);
    }

    function tick() {
      if (stopped) {
        return;
      }

      if (!touchDrag.active) {
        const follow = reduceMotion ? 1 : 0.18;
        focusLogRef.current += (targetLogRef.current - focusLogRef.current) * follow;
      }

      focusLogRef.current = clampScaleLog(focusLogRef.current);
      targetLogRef.current = clampScaleLog(targetLogRef.current);
      render();
      frame = window.requestAnimationFrame(tick);
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const line = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stageNode.clientHeight : 1;
      const delta = Math.max(-180, Math.min(180, event.deltaY * line));
      // Scroll down / swipe up → larger objects (camera flies along the scale).
      targetLogRef.current = clampScaleLog(targetLogRef.current + delta * 0.00155);
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType !== 'touch' || !stageNode.contains(event.target as Node)) {
        return;
      }

      touchDrag.active = true;
      touchDrag.pointerId = event.pointerId;
      touchDrag.lastY = event.clientY;
      touchDrag.lastLog = focusLogRef.current;
      touchDrag.velocity = 0;
      stageNode.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      if (!touchDrag.active || event.pointerId !== touchDrag.pointerId) {
        return;
      }

      const deltaY = touchDrag.lastY - event.clientY;
      const next = clampScaleLog(touchDrag.lastLog + deltaY / 210);
      touchDrag.velocity = next - focusLogRef.current;
      touchDrag.lastY = event.clientY;
      touchDrag.lastLog = next;
      focusLogRef.current = next;
      targetLogRef.current = next;
    }

    function endTouch(event: PointerEvent) {
      if (!touchDrag.active || event.pointerId !== touchDrag.pointerId) {
        return;
      }

      touchDrag.active = false;
      targetLogRef.current = clampScaleLog(focusLogRef.current + touchDrag.velocity * 7);
    }

    function onSliderInput() {
      const next = clampScaleLog(Number(sliderNode.value));
      targetLogRef.current = next;
      if (reduceMotion) {
        focusLogRef.current = next;
      }
    }

    function onSliderPointerDown() {
      sliderDragRef.current = true;
    }

    function onSliderPointerUp() {
      sliderDragRef.current = false;
    }

    stageNode.addEventListener('wheel', onWheel, { passive: false });
    stageNode.addEventListener('pointerdown', onPointerDown);
    stageNode.addEventListener('pointermove', onPointerMove);
    stageNode.addEventListener('pointerup', endTouch);
    stageNode.addEventListener('pointercancel', endTouch);
    sliderNode.addEventListener('input', onSliderInput);
    sliderNode.addEventListener('pointerdown', onSliderPointerDown);
    sliderNode.addEventListener('pointerup', onSliderPointerUp);
    sliderNode.addEventListener('pointercancel', onSliderPointerUp);
    sliderNode.value = String(INITIAL_LOG);
    frame = window.requestAnimationFrame(tick);

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      stageNode.removeEventListener('wheel', onWheel);
      stageNode.removeEventListener('pointerdown', onPointerDown);
      stageNode.removeEventListener('pointermove', onPointerMove);
      stageNode.removeEventListener('pointerup', endTouch);
      stageNode.removeEventListener('pointercancel', endTouch);
      sliderNode.removeEventListener('input', onSliderInput);
      sliderNode.removeEventListener('pointerdown', onSliderPointerDown);
      sliderNode.removeEventListener('pointerup', onSliderPointerUp);
      sliderNode.removeEventListener('pointercancel', onSliderPointerUp);
      for (const image of nodes.values()) {
        image.remove();
      }
      nodes.clear();
    };
  }, []);

  return (
    <div className="flex h-full min-h-[calc(100dvh-8.5rem)] w-full max-w-full flex-col overflow-x-hidden lg:min-h-0">
      <header className="shrink-0">
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Не физика</p>
        <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
          Масштаб Вселенной
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Путешествие от протона до наблюдаемой Вселенной.
        </p>
      </header>

      <div
        ref={stageRef}
        role="application"
        aria-label="Шкала размеров. Колесо мыши или вертикальный жест двигают камеру вдоль шкалы."
        className="relative mt-3 min-h-[240px] w-full flex-1 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/80 touch-none"
      >
        <div ref={layerRef} className="absolute inset-0 overflow-hidden" />
      </div>

      <div className="mt-3 shrink-0 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium uppercase tracking-wide text-zinc-500">
              {hud.name}
            </p>
            <p className="text-2xl font-semibold text-white">{hud.sizeLabel}</p>
            <p className="text-xs text-zinc-500">{hud.dimension}</p>
          </div>
          <div className="min-w-0 text-left sm:text-right">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Масштаб</p>
            <p className="text-lg font-medium text-zinc-100">{hud.scaleLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <div className="relative h-5 w-24 shrink-0" aria-hidden>
            <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-400" />
            <div className="absolute bottom-0 left-0 top-0 w-px bg-zinc-400" />
            <div className="absolute bottom-0 right-0 top-0 w-px bg-zinc-400" />
          </div>
          <p>{hud.rulerLabel}</p>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            <span>Микромир</span>
            <span>Космос</span>
          </div>
          <div className="relative h-3">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 rounded-full bg-zinc-700" />
            <div
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3166F0]"
              style={{ left: `${hud.percent * 100}%` }}
            />
          </div>
        </div>

        <label className="block">
          <span className="sr-only">Масштаб</span>
          <input
            ref={sliderRef}
            type="range"
            min={BOUNDS.min}
            max={BOUNDS.max}
            step={0.001}
            defaultValue={INITIAL_LOG}
            aria-label="Масштаб"
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-[#3166F0]"
          />
        </label>
        <p className="text-xs text-zinc-500">
          Прокрутка над сценой или жест вверх — к большим объектам.
        </p>
      </div>
    </div>
  );
}
