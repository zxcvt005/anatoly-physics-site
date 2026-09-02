'use client';

import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { Pause, Play } from 'lucide-react';
import { SimulationLegend } from '@/components/tools/simulations/SimulationLegend';
import { SimulationScene } from '@/components/tools/simulations/SimulationScene';
import { SimulationToolbar } from '@/components/tools/simulations/SimulationToolbar';
import {
  VECTOR_COLORS,
  VectorArrow,
  accelerationVectorLength,
  forceVectorLength,
  setVectorArrow,
} from '@/components/tools/simulations/VectorArrow';
import {
  FRICTION_BOUNDS,
  INITIAL_MOTION,
  SURFACE_LENGTH_M,
} from '@/lib/tools/simulations/friction/constants';
import {
  createFrictionSnapshot,
  formatAcceleration,
  formatAngle,
  formatMass,
  formatMetersPerSecond,
  formatNewtons,
  stepFriction,
} from '@/lib/tools/simulations/friction/physics';
import type {
  FrictionParams,
  FrictionSnapshot,
  MotionState,
} from '@/lib/tools/simulations/friction/types';
import { lerp } from '@/lib/tools/simulations/math';

const VIEW_W = 900;
const VIEW_H = 540;
const ORIGIN_X = 450;
const ORIGIN_Y = 358;
const SURFACE_HALF = 292;
const PIXELS_PER_METER = (SURFACE_HALF * 2) / SURFACE_LENGTH_M;
const BLOCK_W = 76;
const BLOCK_H = 46;
const STREAK_COUNT = 8;
const SNAPSHOT_MS = 80;

const LEGEND_CORE = [
  { color: VECTOR_COLORS.applied, label: 'F — сила тяги' },
  { color: VECTOR_COLORS.friction, label: 'Fтр — сила трения' },
  { color: VECTOR_COLORS.acceleration, label: 'a — ускорение' },
];

const LEGEND_FORCES = [
  { color: VECTOR_COLORS.weight, label: 'mg' },
  { color: VECTOR_COLORS.normal, label: 'N' },
  { color: VECTOR_COLORS.along, label: 'mg sin α' },
  { color: VECTOR_COLORS.perp, label: 'mg cos α' },
];

const LEGEND_ALL = [...LEGEND_CORE, ...LEGEND_FORCES];

export type FrictionSceneHandle = {
  reset: () => void;
};

type FrictionSceneProps = {
  params: FrictionParams;
  showForces: boolean;
  onSnapshot: (snapshot: FrictionSnapshot) => void;
};

export const FrictionScene = memo(
  forwardRef<FrictionSceneHandle, FrictionSceneProps>(
    function FrictionScene({ params, showForces, onSnapshot }, ref) {
    const svgRef = useRef<SVGSVGElement>(null);
    const worldRef = useRef<SVGGElement>(null);
    const hatchRef = useRef<SVGGElement>(null);
    const blockRef = useRef<SVGGElement>(null);
    const massLabelRef = useRef<SVGTextElement>(null);
    const angleBadgeRef = useRef<HTMLDivElement>(null);
    const angleBadgeTextRef = useRef<HTMLSpanElement>(null);
    const statusRef = useRef<HTMLParagraphElement>(null);
    const statusDotRef = useRef<HTMLSpanElement>(null);
    const statusTextRef = useRef<HTMLSpanElement>(null);
    const velocityRef = useRef<HTMLSpanElement>(null);
    const accelRef = useRef<HTMLSpanElement>(null);
    const frictionRef = useRef<HTMLSpanElement>(null);
    const paramsRef = useRef(params);
    const showForcesRef = useRef(showForces);
    const onSnapshotRef = useRef(onSnapshot);
    const motionRef = useRef<MotionState>({ ...INITIAL_MOTION });
    const visualAngleRef = useRef(0);
    const pausedRef = useRef(false);
    const [paused, setPaused] = useState(false);
    pausedRef.current = paused;

    paramsRef.current = params;
    showForcesRef.current = showForces;
    onSnapshotRef.current = onSnapshot;

    useImperativeHandle(ref, () => ({
      reset: () => {
        motionRef.current = { ...INITIAL_MOTION };
      },
    }));

    useEffect(() => {
      let frame = 0;
      let lastTime = performance.now();
      let lastSnapshot = 0;

      const tick = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        const currentParams = paramsRef.current;
        const targetAngle =
          currentParams.mode === 'inclined' ? currentParams.angleDeg : 0;
        visualAngleRef.current =
          Math.abs(targetAngle - visualAngleRef.current) < 0.08
            ? targetAngle
            : lerp(visualAngleRef.current, targetAngle, Math.min(1, dt * 8));

        const stepped = pausedRef.current
          ? {
              motion: motionRef.current,
              forces: createFrictionSnapshot(currentParams, motionRef.current)
                .forces,
              hitBound: null,
            }
          : stepFriction(
              currentParams,
              motionRef.current,
              dt,
              FRICTION_BOUNDS,
            );

        motionRef.current = stepped.motion;
        drawFrame(
          {
            svg: svgRef.current,
            world: worldRef.current,
            hatch: hatchRef.current,
            block: blockRef.current,
            massLabel: massLabelRef.current,
            angleBadge: angleBadgeRef.current,
            angleBadgeText: angleBadgeTextRef.current,
            status: statusRef.current,
            statusDot: statusDotRef.current,
            statusText: statusTextRef.current,
            velocity: velocityRef.current,
            accel: accelRef.current,
            friction: frictionRef.current,
          },
          currentParams,
          stepped,
          visualAngleRef.current,
          showForcesRef.current,
        );

        if (now - lastSnapshot >= SNAPSHOT_MS) {
          lastSnapshot = now;
          onSnapshotRef.current({
            motion: { ...stepped.motion },
            forces: stepped.forces,
            hitBound: stepped.hitBound,
          });
        }

        frame = window.requestAnimationFrame(tick);
      };

      frame = window.requestAnimationFrame(tick);
      return () => window.cancelAnimationFrame(frame);
    }, []);

    return (
      <SimulationScene label="Симуляция силы трения">
        <div className="relative">
          <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
            <SimulationToolbar>
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/55 px-3 text-sm font-semibold text-zinc-300 backdrop-blur-sm transition hover:border-white/20 hover:text-white"
                aria-label={paused ? 'Продолжить симуляцию' : 'Пауза'}
              >
                {paused ? (
                  <Play className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Pause className="h-3.5 w-3.5" aria-hidden />
                )}
                {paused ? 'Пуск' : 'Пауза'}
              </button>
            </SimulationToolbar>
          </div>
          <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-6.5rem)] space-y-2 sm:left-4 sm:top-4">
            <p
              ref={statusRef}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-semibold text-zinc-200 backdrop-blur-sm"
            >
              <span
                ref={statusDotRef}
                className="h-1.5 w-1.5 rounded-full bg-zinc-400"
                aria-hidden
              />
              <span ref={statusTextRef}>Тело покоится</span>
            </p>
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-black/55 p-2 text-[11px] backdrop-blur-sm sm:text-xs">
              <HudCell label="v" valueRef={velocityRef} initial="0.00 м/с" />
              <HudCell label="a" valueRef={accelRef} initial="0.00 м/с²" />
              <HudCell label="Fтр" valueRef={frictionRef} initial="0.00 Н" />
            </div>
          </div>

          <div
            ref={angleBadgeRef}
            className="pointer-events-none absolute right-3 top-16 z-10 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-semibold tabular-nums text-zinc-200 backdrop-blur-sm sm:right-4"
            hidden
          >
            <span ref={angleBadgeTextRef}>α = 0°</span>
          </div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block h-auto w-full"
            role="img"
            aria-label="Брусок на поверхности с векторами сил"
          >
            <defs>
              <linearGradient id="friction-block-front" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5B86FF" />
                <stop offset="55%" stopColor="#3166F0" />
                <stop offset="100%" stopColor="#1E3FA8" />
              </linearGradient>
              <linearGradient id="friction-surface" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3F4458" />
                <stop offset="100%" stopColor="#1B1E2A" />
              </linearGradient>
              <linearGradient id="friction-surface-edge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2A2E3D" />
                <stop offset="100%" stopColor="#0E1016" />
              </linearGradient>
              <filter id="friction-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.45" />
              </filter>
            </defs>

            <line
              x1="70"
              y1={ORIGIN_Y + 2}
              x2={VIEW_W - 70}
              y2={ORIGIN_Y + 2}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1.5"
              strokeDasharray="8 10"
            />

            {Array.from({ length: STREAK_COUNT }, (_, index) => (
              <line
                key={index}
                data-streak={index}
                x1="0"
                y1="0"
                x2="0"
                y2="0"
                stroke="#93C5FD"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0"
              />
            ))}

            <g ref={worldRef} transform={`translate(${ORIGIN_X} ${ORIGIN_Y})`}>
              <defs>
                <clipPath id="friction-surface-clip">
                  <rect
                    x={-SURFACE_HALF}
                    y="0"
                    width={SURFACE_HALF * 2}
                    height="16"
                    rx="3"
                  />
                </clipPath>
              </defs>
              <g>
                <rect
                  x={-SURFACE_HALF}
                  y="0"
                  width={SURFACE_HALF * 2}
                  height="16"
                  rx="3"
                  fill="url(#friction-surface)"
                />
                <rect
                  x={-SURFACE_HALF}
                  y="16"
                  width={SURFACE_HALF * 2}
                  height="12"
                  rx="2"
                  fill="url(#friction-surface-edge)"
                />
                <g ref={hatchRef} clipPath="url(#friction-surface-clip)">
                  {Array.from({ length: 40 }, (_, index) => {
                    const x = -SURFACE_HALF - 40 + index * 28;
                    return (
                      <line
                        key={index}
                        x1={x}
                        y1="2"
                        x2={x + 9}
                        y2="14"
                        stroke="rgba(255,255,255,0.14)"
                        strokeWidth="1.6"
                      />
                    );
                  })}
                </g>
                <rect
                  x={-SURFACE_HALF}
                  y="-1"
                  width={SURFACE_HALF * 2}
                  height="3"
                  fill="rgba(147,197,253,0.18)"
                />
              </g>

              <g ref={blockRef} filter="url(#friction-soft-shadow)">
                <ellipse
                  cx="0"
                  cy="4"
                  rx="40"
                  ry="5"
                  fill="rgba(0,0,0,0.42)"
                />
                <polygon
                  points={`${BLOCK_W / 2},${-BLOCK_H} ${BLOCK_W / 2 + 14},${-BLOCK_H - 12} ${BLOCK_W / 2 + 14},${-10} ${BLOCK_W / 2},2`}
                  fill="#254ED1"
                />
                <polygon
                  points={`${-BLOCK_W / 2},${-BLOCK_H} ${BLOCK_W / 2},${-BLOCK_H} ${BLOCK_W / 2 + 14},${-BLOCK_H - 12} ${-BLOCK_W / 2 + 14},${-BLOCK_H - 12}`}
                  fill="#7BA0FF"
                />
                <rect
                  x={-BLOCK_W / 2}
                  y={-BLOCK_H}
                  width={BLOCK_W}
                  height={BLOCK_H}
                  rx="5"
                  fill="url(#friction-block-front)"
                />
                <rect
                  x={-BLOCK_W / 2 + 8}
                  y={-BLOCK_H + 8}
                  width={BLOCK_W - 16}
                  height="10"
                  rx="3"
                  fill="rgba(255,255,255,0.14)"
                />
                <text
                  ref={massLabelRef}
                  x="0"
                  y={-BLOCK_H / 2 + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="15"
                  fontWeight="700"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  5 кг
                </text>
              </g>

              <VectorArrow id="applied" color={VECTOR_COLORS.applied} label="F" />
              <VectorArrow id="friction" color={VECTOR_COLORS.friction} label="Fтр" />
              <VectorArrow id="accel" color={VECTOR_COLORS.acceleration} label="a" />
              <VectorArrow id="normal" color={VECTOR_COLORS.normal} label="N" />
              <VectorArrow id="along" color={VECTOR_COLORS.along} label="mg sin α" />
              <VectorArrow id="perp" color={VECTOR_COLORS.perp} label="mg cos α" />
            </g>

            <VectorArrow id="weight" color={VECTOR_COLORS.weight} label="mg" />
          </svg>

          <div className="relative z-10 border-t border-white/5 px-4 py-3">
            <SimulationLegend
              items={showForces ? LEGEND_ALL : LEGEND_CORE}
            />
          </div>
        </div>
      </SimulationScene>
    );
    },
  ),
);

function HudCell({
  label,
  valueRef,
  initial,
}: {
  label: string;
  valueRef: RefObject<HTMLSpanElement | null>;
  initial: string;
}) {
  return (
    <p className="min-w-0 px-1.5">
      <span className="block text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <span
        ref={valueRef}
        className="block truncate font-semibold tabular-nums text-white"
      >
        {initial}
      </span>
    </p>
  );
}

type DrawRefs = {
  svg: SVGSVGElement | null;
  world: SVGGElement | null;
  hatch: SVGGElement | null;
  block: SVGGElement | null;
  massLabel: SVGTextElement | null;
  angleBadge: HTMLDivElement | null;
  angleBadgeText: HTMLSpanElement | null;
  status: HTMLParagraphElement | null;
  statusDot: HTMLSpanElement | null;
  statusText: HTMLSpanElement | null;
  velocity: HTMLSpanElement | null;
  accel: HTMLSpanElement | null;
  friction: HTMLSpanElement | null;
};

function drawFrame(
  refs: DrawRefs,
  params: FrictionParams,
  snapshot: FrictionSnapshot,
  visualAngle: number,
  showForces: boolean,
) {
  const { motion, forces } = snapshot;
  const hatchSpacing = 28;
  const scroll = ((-motion.position * PIXELS_PER_METER) % hatchSpacing + hatchSpacing) % hatchSpacing;

  if (refs.world) {
    refs.world.setAttribute(
      'transform',
      `translate(${ORIGIN_X} ${ORIGIN_Y}) rotate(${visualAngle})`,
    );
  }

  if (refs.hatch) {
    refs.hatch.setAttribute('transform', `translate(${scroll} 0)`);
  }

  if (refs.block) {
    refs.block.setAttribute('transform', 'translate(0 0)');
  }

  if (refs.massLabel) {
    refs.massLabel.textContent = formatMass(params.mass);
  }

  if (refs.angleBadge && refs.angleBadgeText) {
    const showAngle = params.mode === 'inclined';
    refs.angleBadge.hidden = !showAngle;
    refs.angleBadgeText.textContent = `α = ${formatAngle(params.angleDeg)}`;
  }

  const moving = !forces.isResting;
  if (refs.status) {
    refs.status.className = `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-sm ${
      moving
        ? 'border-[#3166F0]/25 bg-[#3166F0]/15 text-blue-100'
        : 'border-white/10 bg-black/55 text-zinc-200'
    }`;
  }
  if (refs.statusDot) {
    refs.statusDot.className = `h-1.5 w-1.5 rounded-full ${
      moving ? 'bg-[#3166F0]' : 'bg-zinc-400'
    }`;
  }
  if (refs.statusText) {
    refs.statusText.textContent = moving ? 'Тело движется' : 'Тело покоится';
  }

  if (refs.velocity) {
    refs.velocity.textContent = formatMetersPerSecond(motion.velocity);
  }
  if (refs.accel) {
    refs.accel.textContent = formatAcceleration(forces.acceleration);
  }
  if (refs.friction) {
    refs.friction.textContent = formatNewtons(Math.abs(forces.friction));
  }

  const originY = -BLOCK_H / 2;
  const appliedLen = forceVectorLength(forces.appliedForce);
  const frictionLen = forceVectorLength(forces.friction);
  const accelLen = forces.isResting
    ? 0
    : accelerationVectorLength(forces.acceleration);

  setVectorArrow(refs.world, 'applied', {
    x: 0,
    y: originY,
    angleDeg: forces.appliedForce >= 0 ? 0 : 180,
    length: appliedLen,
    label: `F = ${formatNewtons(Math.abs(forces.appliedForce))}`,
    labelSide: -1,
  });

  setVectorArrow(refs.world, 'friction', {
    x: 0,
    y: originY + 10,
    angleDeg: forces.friction >= 0 ? 0 : 180,
    length: frictionLen,
    label: `Fтр = ${formatNewtons(Math.abs(forces.friction))}`,
    labelSide: 1,
  });

  setVectorArrow(refs.world, 'accel', {
    x: 0,
    y: originY - BLOCK_H / 2 - 6,
    angleDeg: forces.acceleration >= 0 ? 0 : 180,
    length: accelLen,
    label: `a = ${formatAcceleration(forces.acceleration)}`,
    labelSide: -1,
  });

  const extra = showForces;
  setVectorArrow(refs.world, 'normal', {
    x: 0,
    y: originY,
    angleDeg: -90,
    length: extra ? forceVectorLength(forces.normal) : 0,
    label: `N = ${formatNewtons(forces.normal)}`,
    labelSide: -1,
  });
  setVectorArrow(refs.world, 'along', {
    x: 0,
    y: originY + 18,
    angleDeg: forces.gravityAlong >= 0 ? 0 : 180,
    length:
      extra && params.mode === 'inclined'
        ? forceVectorLength(forces.gravityAlong)
        : 0,
    label: `mg sin α = ${formatNewtons(Math.abs(forces.gravityAlong))}`,
    labelSide: 1,
  });
  setVectorArrow(refs.world, 'perp', {
    x: -16,
    y: originY,
    angleDeg: 90,
    length:
      extra && params.mode === 'inclined'
        ? forceVectorLength(forces.gravityPerp)
        : 0,
    label: `mg cos α = ${formatNewtons(forces.gravityPerp)}`,
    labelSide: 1,
  });

  const angleRad = (visualAngle * Math.PI) / 180;
  const localY = originY;
  const worldX = ORIGIN_X - localY * Math.sin(angleRad);
  const worldY = ORIGIN_Y + localY * Math.cos(angleRad);

  setVectorArrow(refs.svg, 'weight', {
    x: worldX,
    y: worldY,
    angleDeg: 90,
    length: extra ? forceVectorLength(forces.weight) : 0,
    label: `mg = ${formatNewtons(forces.weight)}`,
    labelSide: 1,
  });

  drawStreaks(refs.svg, 0, visualAngle, motion.velocity);
}

function drawStreaks(
  svg: SVGSVGElement | null,
  blockX: number,
  visualAngle: number,
  velocity: number,
) {
  if (!svg) {
    return;
  }

  const speed = Math.abs(velocity);
  const visible = speed > 0.08;
  const length = Math.min(92, 18 + speed * 16);
  const opacity = Math.min(0.42, speed / 7);
  const angleRad = (visualAngle * Math.PI) / 180;
  const dir = velocity >= 0 ? -1 : 1;

  for (let index = 0; index < STREAK_COUNT; index += 1) {
    const line = svg.querySelector(`[data-streak="${index}"]`);
    if (!(line instanceof SVGLineElement)) {
      continue;
    }

    if (!visible) {
      line.setAttribute('opacity', '0');
      continue;
    }

    const along = blockX + dir * (28 + index * 16);
    const localX1 = along;
    const localX2 = along + dir * length * (1 - index * 0.07);
    const localY = -12 - (index % 3) * 8;
    const x1 = ORIGIN_X + localX1 * Math.cos(angleRad) - localY * Math.sin(angleRad);
    const y1 = ORIGIN_Y + localX1 * Math.sin(angleRad) + localY * Math.cos(angleRad);
    const x2 = ORIGIN_X + localX2 * Math.cos(angleRad) - localY * Math.sin(angleRad);
    const y2 = ORIGIN_Y + localX2 * Math.sin(angleRad) + localY * Math.cos(angleRad);

    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('opacity', String(opacity * (1 - index * 0.08)));
  }
}
