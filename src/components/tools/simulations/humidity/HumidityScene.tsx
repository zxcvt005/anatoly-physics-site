'use client';

import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { SimulationScene } from '@/components/tools/simulations/SimulationScene';
import { useSimulationLoop } from '@/components/tools/simulations/useSimulationLoop';
import {
  MAX_FRAME_DT,
  MAX_VOLUME_M3,
  MIN_VOLUME_M3,
  VESSEL,
} from '@/lib/tools/simulations/humidity/constants';
import {
  createParticles,
  formatHumidityNumber,
  liquidHeightFraction,
  phaseLabel,
  stepParticles,
  syncParticles,
  vaporMassToVisualCount,
} from '@/lib/tools/simulations/humidity/physics';
import type {
  HumidityParams,
  HumidityParticle,
  HumiditySnapshot,
} from '@/lib/tools/simulations/humidity/types';

export type HumiditySceneHandle = {
  reset: () => void;
};

type HumiditySceneProps = {
  params: HumidityParams;
  snapshot: HumiditySnapshot;
  onSnapshot?: (snapshot: HumiditySnapshot) => void;
};

const PARTICLE_COLOR = '#7DD3FC';
const HUD_VALUE =
  'inline-block min-w-[4.5ch] text-right font-semibold tabular-nums text-white';

function vesselGeometry(volumeM3: number, liquidMassKg: number) {
  const innerLeft = VESSEL.padX;
  const innerRight = VESSEL.width - VESSEL.padX;
  const innerWidth = innerRight - innerLeft;
  const bottom = VESSEL.height - VESSEL.padBottom;
  const topLimit = VESSEL.padTop + VESSEL.pistonHeight + 8;
  const movable = bottom - topLimit;
  const volFrac =
    (volumeM3 - MIN_VOLUME_M3) / (MAX_VOLUME_M3 - MIN_VOLUME_M3);
  const pistonBottom = topLimit + (1 - volFrac) * movable * 0.72;
  const liquidFrac = liquidHeightFraction(liquidMassKg, volumeM3);
  const liquidTop = bottom - liquidFrac * (bottom - pistonBottom);
  const gasTop = pistonBottom;
  const gasBottom = liquidTop;
  const gasHeight = Math.max(12, gasBottom - gasTop);

  return {
    innerLeft,
    innerRight,
    innerWidth,
    bottom,
    pistonBottom,
    liquidTop,
    gasTop,
    gasBottom,
    gasHeight,
  };
}

export const HumidityScene = memo(
  forwardRef<HumiditySceneHandle, HumiditySceneProps>(function HumidityScene(
    { params, snapshot },
    ref,
  ) {
    const particlesRef = useRef<HumidityParticle[]>([]);
    const svgParticlesRef = useRef<SVGGElement>(null);
    const hudRefs = {
      t: useRef<HTMLSpanElement>(null),
      p: useRef<HTMLSpanElement>(null),
      rho: useRef<HTMLSpanElement>(null),
      n: useRef<HTMLSpanElement>(null),
      v: useRef<HTMLSpanElement>(null),
      m: useRef<HTMLSpanElement>(null),
      pSat: useRef<HTMLSpanElement>(null),
      rhoSat: useRef<HTMLSpanElement>(null),
      phase: useRef<HTMLSpanElement>(null),
    };
    const liquidRef = useRef<SVGRectElement>(null);
    const pistonRef = useRef<SVGGElement>(null);
    const arrowsRef = useRef<SVGGElement>(null);
    const prevLiquidRef = useRef(snapshot.liquidMassKg);
    const transferModeRef = useRef<'none' | 'condense' | 'evaporate'>('none');
    const transferTimerRef = useRef(0);
    const snapshotRef = useRef(snapshot);
    const paramsRef = useRef(params);
    snapshotRef.current = snapshot;
    paramsRef.current = params;

    const resetParticles = () => {
      const geo = vesselGeometry(
        snapshotRef.current.volumeM3,
        snapshotRef.current.liquidMassKg,
      );
      const count = vaporMassToVisualCount(
        snapshotRef.current.vaporMassKg,
        snapshotRef.current.volumeM3,
      );
      particlesRef.current = createParticles(
        count,
        geo.innerWidth,
        geo.gasHeight,
        42,
      );
    };

    useImperativeHandle(ref, () => ({
      reset: () => {
        prevLiquidRef.current = 0;
        transferModeRef.current = 'none';
        resetParticles();
      },
    }));

    useEffect(() => {
      resetParticles();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const geo = vesselGeometry(snapshot.volumeM3, snapshot.liquidMassKg);
      const count = vaporMassToVisualCount(
        snapshot.vaporMassKg,
        snapshot.volumeM3,
      );
      particlesRef.current = syncParticles(
        particlesRef.current,
        count,
        geo.innerWidth,
        geo.gasHeight,
      );

      const delta = snapshot.liquidMassKg - prevLiquidRef.current;
      if (delta > 1e-6) {
        transferModeRef.current = 'condense';
        transferTimerRef.current = 0.9;
      } else if (delta < -1e-6) {
        transferModeRef.current = 'evaporate';
        transferTimerRef.current = 0.9;
      }
      prevLiquidRef.current = snapshot.liquidMassKg;
    }, [snapshot]);

    useSimulationLoop((dt) => {
      const snap = snapshotRef.current;
      const geo = vesselGeometry(snap.volumeM3, snap.liquidMassKg);

      stepParticles(
        particlesRef.current,
        dt,
        geo.innerWidth,
        geo.gasHeight,
      );

      if (transferTimerRef.current > 0) {
        transferTimerRef.current = Math.max(0, transferTimerRef.current - dt);
        if (transferTimerRef.current <= 0) {
          transferModeRef.current = 'none';
        }
      }

      const group = svgParticlesRef.current;
      if (group) {
        const existing = group.querySelectorAll('circle');
        const particles = particlesRef.current;
        while (existing.length > particles.length) {
          existing[existing.length - 1]?.remove();
        }
        particles.forEach((p, index) => {
          let circle = existing[index] as SVGCircleElement | undefined;
          if (!circle) {
            circle = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'circle',
            );
            circle.setAttribute('r', '3.1');
            circle.setAttribute('fill', PARTICLE_COLOR);
            circle.setAttribute('opacity', '0.9');
            group.appendChild(circle);
          }
          circle.setAttribute('cx', String(geo.innerLeft + p.x));
          circle.setAttribute('cy', String(geo.gasTop + p.y));
        });
      }

      if (pistonRef.current) {
        pistonRef.current.setAttribute(
          'transform',
          `translate(0 ${geo.pistonBottom - VESSEL.pistonHeight})`,
        );
      }

      if (liquidRef.current) {
        const h = Math.max(0, geo.bottom - geo.liquidTop);
        liquidRef.current.setAttribute('y', String(geo.liquidTop));
        liquidRef.current.setAttribute('height', String(h));
        liquidRef.current.setAttribute(
          'opacity',
          h > 0.5 ? '0.85' : '0',
        );
      }

      const arrows = arrowsRef.current;
      if (arrows) {
        const mode = transferModeRef.current;
        arrows.setAttribute(
          'visibility',
          mode === 'none' ? 'hidden' : 'visible',
        );
        arrows.querySelectorAll('[data-dir]').forEach((node) => {
          const dir = node.getAttribute('data-dir');
          node.setAttribute(
            'opacity',
            dir === mode ? '0.9' : '0',
          );
        });
      }

      if (hudRefs.t.current) {
        hudRefs.t.current.textContent = formatHumidityNumber(snap.temperatureC, 1);
      }
      if (hudRefs.p.current) {
        hudRefs.p.current.textContent = formatHumidityNumber(snap.vaporPressureKPa, 3);
      }
      if (hudRefs.rho.current) {
        hudRefs.rho.current.textContent = formatHumidityNumber(snap.vaporDensityKgM3, 4);
      }
      if (hudRefs.n.current) {
        hudRefs.n.current.textContent = formatHumidityNumber(
          snap.vaporConcentrationPerM3,
          2,
        );
      }
      if (hudRefs.v.current) {
        hudRefs.v.current.textContent = formatHumidityNumber(snap.volumeM3, 2);
      }
      if (hudRefs.m.current) {
        hudRefs.m.current.textContent = formatHumidityNumber(snap.totalMassKg, 4);
      }
      if (hudRefs.pSat.current) {
        hudRefs.pSat.current.textContent = formatHumidityNumber(snap.pSatKPa, 3);
      }
      if (hudRefs.rhoSat.current) {
        hudRefs.rhoSat.current.textContent = formatHumidityNumber(snap.rhoSatKgM3, 4);
      }
      if (hudRefs.phase.current) {
        hudRefs.phase.current.textContent = phaseLabel(snap.phase);
      }
    }, { maxDt: MAX_FRAME_DT });

    const geo = vesselGeometry(snapshot.volumeM3, snapshot.liquidMassKg);

    return (
      <SimulationScene label="Влажность водяного пара" fitHeight className="h-full w-full">
        <div className="flex h-full min-h-0 flex-col gap-2 p-2 sm:p-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-zinc-400 sm:text-xs">
            <span className="inline-flex items-baseline gap-1">
              <span>T =</span>
              <span ref={hudRefs.t} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.temperatureC, 1)}
              </span>
              <span>°C</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>P =</span>
              <span ref={hudRefs.p} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.vaporPressureKPa, 3)}
              </span>
              <span>кПа</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>ρ =</span>
              <span ref={hudRefs.rho} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.vaporDensityKgM3, 4)}
              </span>
              <span>кг/м³</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>n =</span>
              <span ref={hudRefs.n} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.vaporConcentrationPerM3, 2)}
              </span>
              <span>1/м³</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>V =</span>
              <span ref={hudRefs.v} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.volumeM3, 2)}
              </span>
              <span>м³</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>m =</span>
              <span ref={hudRefs.m} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.totalMassKg, 4)}
              </span>
              <span>кг</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-zinc-500 sm:text-xs">
            <span className="inline-flex items-baseline gap-1">
              <span>Pнас =</span>
              <span ref={hudRefs.pSat} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.pSatKPa, 3)}
              </span>
              <span>кПа</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>ρнас =</span>
              <span ref={hudRefs.rhoSat} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.rhoSatKgM3, 4)}
              </span>
              <span>кг/м³</span>
            </span>
            <span
              ref={hudRefs.phase}
              className="rounded-full border border-[#3166F0]/25 bg-[#3166F0]/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-100"
            >
              {phaseLabel(snapshot.phase)}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center">
            <svg
              viewBox={`0 0 ${VESSEL.width} ${VESSEL.height}`}
              className="h-full max-h-[min(100%,28rem)] w-auto max-w-full"
              role="img"
              aria-label="Сосуд с водяным паром под поршнем"
            >
              <defs>
                <linearGradient id="humidity-liquid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0.85" />
                </linearGradient>
              </defs>

              <rect
                x={VESSEL.padX - VESSEL.wall}
                y={VESSEL.padTop}
                width={VESSEL.width - 2 * (VESSEL.padX - VESSEL.wall)}
                height={VESSEL.height - VESSEL.padTop - VESSEL.padBottom + 4}
                rx="10"
                fill="rgba(12,18,32,0.95)"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="2"
              />

              <rect
                ref={liquidRef}
                x={geo.innerLeft}
                y={geo.liquidTop}
                width={geo.innerWidth}
                height={Math.max(0, geo.bottom - geo.liquidTop)}
                fill="url(#humidity-liquid)"
                opacity={snapshot.liquidMassKg > 1e-12 ? 0.85 : 0}
              />

              <g ref={svgParticlesRef} />

              <g ref={arrowsRef} visibility="hidden">
                {[0.22, 0.5, 0.78].map((frac, index) => {
                  const x = geo.innerLeft + geo.innerWidth * frac;
                  const y = geo.gasTop + geo.gasHeight * 0.55;
                  return (
                    <g key={`c-${index}`} data-dir="condense" opacity="0">
                      <path
                        d={`M ${x} ${y - 10} L ${x} ${y + 10}`}
                        stroke="#38BDF8"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d={`M ${x - 4} ${y + 4} L ${x} ${y + 10} L ${x + 4} ${y + 4}`}
                        fill="none"
                        stroke="#38BDF8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  );
                })}
                {[0.22, 0.5, 0.78].map((frac, index) => {
                  const x = geo.innerLeft + geo.innerWidth * frac;
                  const y = geo.gasTop + geo.gasHeight * 0.7;
                  return (
                    <g key={`e-${index}`} data-dir="evaporate" opacity="0">
                      <path
                        d={`M ${x} ${y + 10} L ${x} ${y - 10}`}
                        stroke="#FDE68A"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d={`M ${x - 4} ${y - 4} L ${x} ${y - 10} L ${x + 4} ${y - 4}`}
                        fill="none"
                        stroke="#FDE68A"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  );
                })}
              </g>

              <g
                ref={pistonRef}
                transform={`translate(0 ${geo.pistonBottom - VESSEL.pistonHeight})`}
              >
                <rect
                  x={geo.innerLeft - 4}
                  y={0}
                  width={geo.innerWidth + 8}
                  height={VESSEL.pistonHeight}
                  rx="3"
                  fill="#3166F0"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="1.25"
                />
                <line
                  x1={VESSEL.width / 2}
                  y1={-28}
                  x2={VESSEL.width / 2}
                  y2={0}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>

              <text
                x={VESSEL.width / 2}
                y={VESSEL.height - 10}
                textAnchor="middle"
                fill="rgba(161,161,170,0.9)"
                fontSize="11"
              >
                V = {formatHumidityNumber(params.volumeM3, 2)} м³
              </text>
            </svg>
          </div>
        </div>
      </SimulationScene>
    );
  }),
);
