'use client';

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { HumidityRhHudControl } from '@/components/tools/simulations/humidity/HumidityRhHudControl';
import { SimulationScene } from '@/components/tools/simulations/SimulationScene';
import { SimulationSlider } from '@/components/tools/simulations/SimulationSlider';
import { useSimulationLoop } from '@/components/tools/simulations/useSimulationLoop';
import {
  HUMIDITY_RANGES,
  MAX_FRAME_DT,
  MAX_VOLUME_M3,
  MIN_VOLUME_M3,
  SNAPSHOT_MS,
  VESSEL,
} from '@/lib/tools/simulations/humidity/constants';
import {
  buildSnapshotFromMasses,
  clampVolumeM3,
  createParticles,
  createPhaseMassesAllVapor,
  formatHumidityNumber,
  liquidHeightFraction,
  phaseLabel,
  reconcilePhaseMasses,
  requestedTotalMassKg,
  stepParticles,
  stepPhaseMasses,
  syncParticles,
  vaporMassToVisualCount,
} from '@/lib/tools/simulations/humidity/physics';
import type {
  HumidityParams,
  HumidityParticle,
  HumidityPhaseMasses,
  HumiditySnapshot,
} from '@/lib/tools/simulations/humidity/types';

export type HumiditySceneHandle = {
  reset: () => void;
};

type HumiditySceneProps = {
  params: HumidityParams;
  volumeM3: number;
  onVolumeChange: (volumeM3: number) => void;
  onLiveSnapshot: (snapshot: HumiditySnapshot) => void;
  liveRhPercent: number;
  onApplyCustomRh: (rhPercent: number) => void;
};

const PARTICLE_COLOR = '#7DD3FC';
const HUD_VALUE =
  'inline-block min-w-[4.5ch] text-right font-semibold tabular-nums text-white';
const INNER_RX = 8;

type VesselGeo = {
  innerLeft: number;
  innerWidth: number;
  bottom: number;
  pistonBottom: number;
  liquidTop: number;
  gasTop: number;
  gasHeight: number;
  wallTop: number;
  wallHeight: number;
};

function vesselGeometry(volumeM3: number, liquidMassKg: number): VesselGeo {
  const innerLeft = VESSEL.padX;
  const innerWidth = VESSEL.width - VESSEL.padX * 2;
  const bottom = VESSEL.height - VESSEL.padBottom;
  const wallTop = VESSEL.padTop;
  const wallHeight = bottom - wallTop + 4;
  const topLimit = VESSEL.padTop + VESSEL.pistonHeight + 8;
  const movable = bottom - topLimit;
  const volFrac =
    (volumeM3 - MIN_VOLUME_M3) / (MAX_VOLUME_M3 - MIN_VOLUME_M3);
  const pistonBottom = topLimit + (1 - volFrac) * movable * 0.72;
  const liquidFrac = liquidHeightFraction(liquidMassKg, volumeM3);
  const liquidTop = bottom - liquidFrac * (bottom - pistonBottom);
  const gasTop = pistonBottom;
  const gasHeight = Math.max(12, liquidTop - gasTop);

  return {
    innerLeft,
    innerWidth,
    bottom,
    pistonBottom,
    liquidTop,
    gasTop,
    gasHeight,
    wallTop,
    wallHeight,
  };
}

function volumeFromPistonBottom(pistonBottom: number): number {
  const bottom = VESSEL.height - VESSEL.padBottom;
  const topLimit = VESSEL.padTop + VESSEL.pistonHeight + 8;
  const movable = (bottom - topLimit) * 0.72;
  const clamped = Math.min(topLimit + movable, Math.max(topLimit, pistonBottom));
  const volFrac = 1 - (clamped - topLimit) / Math.max(movable, 1e-9);
  return Math.min(
    MAX_VOLUME_M3,
    Math.max(
      MIN_VOLUME_M3,
      MIN_VOLUME_M3 + volFrac * (MAX_VOLUME_M3 - MIN_VOLUME_M3),
    ),
  );
}

/** Exported for verify scripts — same clamp path as piston drag. */
export function volumeFromPistonDrag(pistonBottom: number): number {
  return clampVolumeM3(volumeFromPistonBottom(pistonBottom));
}

function drawParticles(
  canvas: HTMLCanvasElement,
  particles: HumidityParticle[],
  width: number,
  height: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = Math.max(1, Math.round(width));
  const cssH = Math.max(1, Math.round(height));
  const targetW = Math.round(cssW * dpr);
  const targetH = Math.round(cssH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = PARTICLE_COLOR;
  ctx.globalAlpha = 0.92;
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const HumidityScene = memo(
  forwardRef<HumiditySceneHandle, HumiditySceneProps>(function HumidityScene(
    {
      params,
      volumeM3,
      onVolumeChange,
      onLiveSnapshot,
      liveRhPercent,
      onApplyCustomRh,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<HumidityParticle[]>([]);
    const paramsRef = useRef(params);
    const massesRef = useRef<HumidityPhaseMasses>(createPhaseMassesAllVapor(params));
    const liveRef = useRef<HumiditySnapshot>(
      buildSnapshotFromMasses(params, massesRef.current),
    );
    const lastEmitRef = useRef(0);
    const onLiveSnapshotRef = useRef(onLiveSnapshot);
    const onVolumeChangeRef = useRef(onVolumeChange);
    const draggingRef = useRef(false);

    paramsRef.current = params;
    onLiveSnapshotRef.current = onLiveSnapshot;
    onVolumeChangeRef.current = onVolumeChange;

    const liquidGroupRef = useRef<SVGGElement>(null);
    const liquidBodyRef = useRef<SVGPathElement>(null);
    const pistonRef = useRef<SVGGElement>(null);
    const canvasWrapRef = useRef<HTMLDivElement>(null);
    const arrowsCondenseRef = useRef<SVGGElement>(null);
    const arrowsEvaporateRef = useRef<SVGGElement>(null);
    const processBlockRef = useRef<HTMLDivElement>(null);
    const processLabelRef = useRef<HTMLSpanElement>(null);
    const processBarRef = useRef<HTMLDivElement>(null);
    const volumeLabelRef = useRef<HTMLSpanElement>(null);

    const hudTRef = useRef<HTMLSpanElement>(null);
    const hudPRef = useRef<HTMLSpanElement>(null);
    const hudRhoRef = useRef<HTMLSpanElement>(null);
    const hudNRef = useRef<HTMLSpanElement>(null);
    const hudVRef = useRef<HTMLSpanElement>(null);
    const hudMRef = useRef<HTMLSpanElement>(null);
    const hudPSatRef = useRef<HTMLSpanElement>(null);
    const hudRhoSatRef = useRef<HTMLSpanElement>(null);
    const hudPhaseRef = useRef<HTMLSpanElement>(null);

    const syncTotalFromParams = (nextParams: HumidityParams) => {
      const total = requestedTotalMassKg(nextParams);
      massesRef.current = reconcilePhaseMasses(massesRef.current, total);
    };

    useImperativeHandle(ref, () => ({
      reset: () => {
        const next = paramsRef.current;
        massesRef.current = createPhaseMassesAllVapor(next);
        const live = buildSnapshotFromMasses(next, massesRef.current);
        liveRef.current = live;
        const geo = vesselGeometry(live.volumeM3, live.liquidMassKg);
        const count = vaporMassToVisualCount(live.vaporMassKg, live.volumeM3);
        particlesRef.current = createParticles(
          count,
          geo.innerWidth,
          geo.gasHeight,
          42,
        );
        onLiveSnapshotRef.current(live);
      },
    }));

    useEffect(() => {
      syncTotalFromParams(params);
    }, [params]);

    useEffect(() => {
      const next = paramsRef.current;
      massesRef.current = createPhaseMassesAllVapor(next);
      const live = buildSnapshotFromMasses(next, massesRef.current);
      liveRef.current = live;
      const geo = vesselGeometry(live.volumeM3, live.liquidMassKg);
      particlesRef.current = createParticles(
        vaporMassToVisualCount(live.vaporMassKg, live.volumeM3),
        geo.innerWidth,
        geo.gasHeight,
        42,
      );
      onLiveSnapshotRef.current(live);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateLayout = (live: HumiditySnapshot) => {
      const geo = vesselGeometry(live.volumeM3, live.liquidMassKg);
      const pistonY = geo.pistonBottom - VESSEL.pistonHeight;

      if (pistonRef.current) {
        pistonRef.current.setAttribute('transform', `translate(0 ${pistonY})`);
      }

      if (liquidBodyRef.current && liquidGroupRef.current) {
        const h = Math.max(0, geo.bottom - geo.liquidTop);
        if (h < 0.5 || live.liquidMassKg <= 1e-12) {
          liquidGroupRef.current.setAttribute('opacity', '0');
        } else {
          liquidGroupRef.current.setAttribute('opacity', '1');
          const left = geo.innerLeft;
          const right = geo.innerLeft + geo.innerWidth;
          const top = geo.liquidTop;
          const bottom = geo.bottom;
          const mid = (left + right) / 2;
          const wave = Math.min(4.5, h * 0.12);
          liquidBodyRef.current.setAttribute(
            'd',
            [
              `M ${left.toFixed(1)} ${bottom.toFixed(1)}`,
              `L ${left.toFixed(1)} ${(top + wave * 0.35).toFixed(1)}`,
              `Q ${mid.toFixed(1)} ${(top - wave).toFixed(1)} ${right.toFixed(1)} ${(top + wave * 0.35).toFixed(1)}`,
              `L ${right.toFixed(1)} ${bottom.toFixed(1)}`,
              'Z',
            ].join(' '),
          );
        }
      }

      if (canvasWrapRef.current) {
        canvasWrapRef.current.style.left = `${(geo.innerLeft / VESSEL.width) * 100}%`;
        canvasWrapRef.current.style.top = `${(geo.gasTop / VESSEL.height) * 100}%`;
        canvasWrapRef.current.style.width = `${(geo.innerWidth / VESSEL.width) * 100}%`;
        canvasWrapRef.current.style.height = `${(geo.gasHeight / VESSEL.height) * 100}%`;
      }

      return geo;
    };

    useSimulationLoop((dt) => {
      const currentParams = paramsRef.current;
      syncTotalFromParams(currentParams);

      const stepped = stepPhaseMasses(massesRef.current, currentParams, dt);
      massesRef.current = stepped.masses;
      const live = buildSnapshotFromMasses(
        currentParams,
        stepped.masses,
        stepped.process,
        stepped.intensity,
      );
      liveRef.current = live;

      const geo = updateLayout(live);
      const count = vaporMassToVisualCount(live.vaporMassKg, live.volumeM3);
      particlesRef.current = syncParticles(
        particlesRef.current,
        count,
        geo.innerWidth,
        geo.gasHeight,
      );
      stepParticles(particlesRef.current, dt, geo.innerWidth, geo.gasHeight);

      const canvas = canvasRef.current;
      if (canvas) {
        drawParticles(canvas, particlesRef.current, geo.innerWidth, geo.gasHeight);
      }

      if (processBlockRef.current && processLabelRef.current && processBarRef.current) {
        if (live.process === 'none') {
          processBlockRef.current.style.opacity = '0';
          processBlockRef.current.style.pointerEvents = 'none';
        } else {
          processBlockRef.current.style.opacity = '1';
          processLabelRef.current.textContent =
            live.process === 'condense' ? 'Идёт конденсация' : 'Идёт испарение';
          processBarRef.current.style.width = `${Math.round(live.processIntensity * 100)}%`;
        }
      }

      if (arrowsCondenseRef.current) {
        arrowsCondenseRef.current.setAttribute(
          'opacity',
          live.process === 'condense' ? String(0.55 + live.processIntensity * 0.4) : '0',
        );
      }
      if (arrowsEvaporateRef.current) {
        arrowsEvaporateRef.current.setAttribute(
          'opacity',
          live.process === 'evaporate' ? String(0.55 + live.processIntensity * 0.4) : '0',
        );
      }

      if (hudTRef.current) {
        hudTRef.current.textContent = formatHumidityNumber(live.temperatureC, 1);
      }
      if (hudPRef.current) {
        hudPRef.current.textContent = formatHumidityNumber(live.vaporPressureKPa, 3);
      }
      if (hudRhoRef.current) {
        hudRhoRef.current.textContent = formatHumidityNumber(live.vaporDensityKgM3, 4);
      }
      if (hudNRef.current) {
        hudNRef.current.textContent = formatHumidityNumber(
          live.vaporConcentrationPerM3,
          2,
        );
      }
      if (hudVRef.current) {
        hudVRef.current.textContent = formatHumidityNumber(live.volumeM3, 2);
      }
      if (hudMRef.current) {
        hudMRef.current.textContent = formatHumidityNumber(live.totalMassKg, 4);
      }
      if (hudPSatRef.current) {
        hudPSatRef.current.textContent = formatHumidityNumber(live.pSatKPa, 3);
      }
      if (hudRhoSatRef.current) {
        hudRhoSatRef.current.textContent = formatHumidityNumber(live.rhoSatKgM3, 4);
      }
      if (hudPhaseRef.current) {
        hudPhaseRef.current.textContent = phaseLabel(live.phase);
      }
      if (volumeLabelRef.current) {
        volumeLabelRef.current.textContent = formatHumidityNumber(live.volumeM3, 2);
      }

      const now = performance.now();
      if (now - lastEmitRef.current >= SNAPSHOT_MS) {
        lastEmitRef.current = now;
        onLiveSnapshotRef.current(live);
      }
    }, { maxDt: MAX_FRAME_DT });

    const handlePistonPointerDown = useCallback(
      (event: React.PointerEvent<SVGGElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const svg = event.currentTarget.ownerSVGElement;
        if (!svg) {
          return;
        }
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);

        const move = (clientY: number) => {
          const rect = svg.getBoundingClientRect();
          const y = ((clientY - rect.top) / rect.height) * VESSEL.height;
          onVolumeChangeRef.current(
            volumeFromPistonDrag(y + VESSEL.pistonHeight / 2),
          );
        };

        move(event.clientY);

        const onMove = (ev: PointerEvent) => {
          if (!draggingRef.current) return;
          move(ev.clientY);
        };
        const onUp = (ev: PointerEvent) => {
          draggingRef.current = false;
          try {
            event.currentTarget.releasePointerCapture(ev.pointerId);
          } catch {
            // ignore
          }
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      },
      [],
    );

    const initialGeo = vesselGeometry(volumeM3, liveRef.current.liquidMassKg);
    const clipX = VESSEL.padX - VESSEL.wall + 2;
    const clipW = VESSEL.width - 2 * (VESSEL.padX - VESSEL.wall) - 4;

    return (
      <SimulationScene
        label="Влажность водяного пара"
        fitHeight
        className="h-full w-full"
      >
        <div className="flex h-full min-h-0 flex-col gap-2 p-2 sm:p-3">
          <div className="flex shrink-0 items-start justify-between gap-3 px-1">
            <HumidityRhHudControl
              liveRhPercent={liveRhPercent}
              onApply={onApplyCustomRh}
            />

            <div
              ref={processBlockRef}
              className="w-[9.5rem] shrink-0 overflow-hidden rounded-xl border border-[#3166F0]/30 bg-[#3166F0]/12 px-2.5 pb-0 pt-2 opacity-0 transition-opacity duration-300"
            >
              <span
                ref={processLabelRef}
                className="block text-center text-[11px] font-semibold text-blue-100"
              >
                Идёт конденсация
              </span>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  ref={processBarRef}
                  className="h-full rounded-full bg-[#3166F0] transition-[width] duration-150 ease-out"
                  style={{ width: '0%' }}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-zinc-400 sm:text-xs">
            <span className="inline-flex items-baseline gap-1">
              <span>T =</span>
              <span ref={hudTRef} className={HUD_VALUE}>
                {formatHumidityNumber(params.temperatureC, 1)}
              </span>
              <span>°C</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>P =</span>
              <span ref={hudPRef} className={HUD_VALUE}>
                —
              </span>
              <span>кПа</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>ρ =</span>
              <span ref={hudRhoRef} className={HUD_VALUE}>
                —
              </span>
              <span>кг/м³</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>n =</span>
              <span ref={hudNRef} className={HUD_VALUE}>
                —
              </span>
              <span>1/м³</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>V =</span>
              <span ref={hudVRef} className={HUD_VALUE}>
                {formatHumidityNumber(volumeM3, 2)}
              </span>
              <span>м³</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>m =</span>
              <span ref={hudMRef} className={HUD_VALUE}>
                —
              </span>
              <span>кг</span>
            </span>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-zinc-500 sm:text-xs">
            <span className="inline-flex items-baseline gap-1">
              <span>Pнас =</span>
              <span ref={hudPSatRef} className={HUD_VALUE}>
                —
              </span>
              <span>кПа</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>ρнас =</span>
              <span ref={hudRhoSatRef} className={HUD_VALUE}>
                —
              </span>
              <span>кг/м³</span>
            </span>
            <span
              ref={hudPhaseRef}
              className="rounded-full border border-[#3166F0]/25 bg-[#3166F0]/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-100"
            >
              —
            </span>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            <div
              className="relative h-full max-h-full w-auto"
              style={{ aspectRatio: `${VESSEL.width} / ${VESSEL.height}` }}
            >
              <svg
                viewBox={`0 0 ${VESSEL.width} ${VESSEL.height}`}
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Сосуд с водяным паром под поршнем"
              >
                <defs>
                  <linearGradient
                    id="humidity-liquid-fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.55" />
                    <stop offset="55%" stopColor="#38BDF8" stopOpacity="0.72" />
                    <stop offset="100%" stopColor="#0284C7" stopOpacity="0.9" />
                  </linearGradient>
                  <clipPath id="humidity-vessel-inner-clip">
                    <rect
                      x={clipX}
                      y={VESSEL.padTop}
                      width={clipW}
                      height={VESSEL.height - VESSEL.padTop - VESSEL.padBottom + 4}
                      rx={INNER_RX}
                      ry={INNER_RX}
                    />
                  </clipPath>
                </defs>

                <rect
                  x={VESSEL.padX - VESSEL.wall}
                  y={VESSEL.padTop}
                  width={VESSEL.width - 2 * (VESSEL.padX - VESSEL.wall)}
                  height={VESSEL.height - VESSEL.padTop - VESSEL.padBottom + 4}
                  rx="10"
                  fill="rgba(12,18,32,0.95)"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="2"
                />

                <g clipPath="url(#humidity-vessel-inner-clip)">
                  <g ref={liquidGroupRef} opacity="0">
                    <path
                      ref={liquidBodyRef}
                      d=""
                      fill="url(#humidity-liquid-fill)"
                    />
                  </g>
                </g>

                <g
                  ref={arrowsCondenseRef}
                  opacity="0"
                  stroke="#38BDF8"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {[0.25, 0.5, 0.75].map((frac) => {
                    const x = initialGeo.innerLeft + initialGeo.innerWidth * frac;
                    const y = initialGeo.gasTop + initialGeo.gasHeight * 0.55;
                    return (
                      <g key={`cd-${frac}`}>
                        <path d={`M ${x} ${y - 10} L ${x} ${y + 10}`} />
                        <path
                          d={`M ${x - 4} ${y + 4} L ${x} ${y + 10} L ${x + 4} ${y + 4}`}
                        />
                      </g>
                    );
                  })}
                </g>
                <g
                  ref={arrowsEvaporateRef}
                  opacity="0"
                  stroke="#FDE68A"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {[0.25, 0.5, 0.75].map((frac) => {
                    const x = initialGeo.innerLeft + initialGeo.innerWidth * frac;
                    const y = initialGeo.gasTop + initialGeo.gasHeight * 0.65;
                    return (
                      <g key={`ev-${frac}`}>
                        <path d={`M ${x} ${y + 10} L ${x} ${y - 10}`} />
                        <path
                          d={`M ${x - 4} ${y - 4} L ${x} ${y - 10} L ${x + 4} ${y - 4}`}
                        />
                      </g>
                    );
                  })}
                </g>

                <g
                  ref={pistonRef}
                  transform={`translate(0 ${initialGeo.pistonBottom - VESSEL.pistonHeight})`}
                  className="cursor-ns-resize"
                  style={{ touchAction: 'none' }}
                  onPointerDown={handlePistonPointerDown}
                >
                  <rect
                    x={initialGeo.innerLeft - 6}
                    y={-6}
                    width={initialGeo.innerWidth + 12}
                    height={VESSEL.pistonHeight + 12}
                    fill="transparent"
                  />
                  <rect
                    x={initialGeo.innerLeft - 4}
                    y={0}
                    width={initialGeo.innerWidth + 8}
                    height={VESSEL.pistonHeight}
                    rx="3"
                    fill="#3166F0"
                    stroke="rgba(255,255,255,0.28)"
                    strokeWidth="1.25"
                  />
                  <line
                    x1={VESSEL.width / 2}
                    y1={-26}
                    x2={VESSEL.width / 2}
                    y2={0}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <rect
                    x={VESSEL.width / 2 - 14}
                    y={-34}
                    width="28"
                    height="10"
                    rx="3"
                    fill="#2858d4"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1"
                  />
                </g>
              </svg>

              <div
                ref={canvasWrapRef}
                className="pointer-events-none absolute overflow-hidden"
                style={{
                  left: `${(initialGeo.innerLeft / VESSEL.width) * 100}%`,
                  top: `${(initialGeo.gasTop / VESSEL.height) * 100}%`,
                  width: `${(initialGeo.innerWidth / VESSEL.width) * 100}%`,
                  height: `${(initialGeo.gasHeight / VESSEL.height) * 100}%`,
                }}
              >
                <canvas ref={canvasRef} className="h-full w-full" />
              </div>
            </div>
          </div>

          <div className="shrink-0 px-1 pb-1">
            <div className="mb-1 flex items-baseline justify-center gap-1.5 text-sm text-zinc-300">
              <span>V =</span>
              <span
                ref={volumeLabelRef}
                className="min-w-[4ch] text-right font-semibold tabular-nums text-white"
              >
                {formatHumidityNumber(volumeM3, 2)}
              </span>
              <span>м³</span>
            </div>
            <SimulationSlider
              label="Объём сосуда"
              value={volumeM3}
              min={HUMIDITY_RANGES.volumeM3.min}
              max={HUMIDITY_RANGES.volumeM3.max}
              step={HUMIDITY_RANGES.volumeM3.step}
              displayValue={`${formatHumidityNumber(volumeM3, 2)} м³`}
              onChange={(nextVolume) => onVolumeChange(clampVolumeM3(nextVolume))}
            />
          </div>
        </div>
      </SimulationScene>
    );
  }),
);
