'use client';

import { forwardRef, memo, useCallback, useImperativeHandle, useRef, type RefObject } from 'react';
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
import { useSimulationLoop } from '@/components/tools/simulations/useSimulationLoop';
import {
  FRICTION_BOUNDS,
  FRICTION_DEFAULT_PARAMS,
  INITIAL_MOTION,
  MAX_FRAME_DT,
  SURFACE_LENGTH_M,
} from '@/lib/tools/simulations/friction/constants';
import {
  createFrictionSnapshot,
  formatAcceleration,
  formatAngle,
  formatMass,
  formatMetersPerSecond,
  formatNewtons,
  sanitizeMotion,
  stepFriction,
} from '@/lib/tools/simulations/friction/physics';
import type {
  FrictionParams,
  FrictionSnapshot,
  MotionState,
} from '@/lib/tools/simulations/friction/types';
import { finiteNumber, lerp, wrapRange } from '@/lib/tools/simulations/math';
import { massToVisualScale } from '@/lib/tools/simulations/friction/visual';
import {
  localFromWorld,
  placeLabelsNearTips,
  worldFromLocal,
  type LabelPoint,
  type TipLabelRequest,
} from '@/lib/tools/simulations/vector-label-layout';

const VIEW_W = 1120;
const ORIGIN_X = 560;
const ORIGIN_Y = 540;
/**
 * Zoom-out of the friction composition via a wider/taller viewBox.
 * Physics, vector lengths, and label placement stay in the same SVG units.
 */
const VIEW_ZOOM_OUT = 2;
const VIEW_BOX_BASE_W = 1120;
const VIEW_BOX_BASE_H = 680;
const VIEW_BOX_W = VIEW_BOX_BASE_W * VIEW_ZOOM_OUT;
const VIEW_BOX_H = VIEW_BOX_BASE_H * VIEW_ZOOM_OUT;
const VIEW_BOX_X = ORIGIN_X - VIEW_BOX_W / 2;
const VIEW_BOX_Y = ORIGIN_Y - VIEW_BOX_H / 2;
const SURFACE_HALF = 500;
const SURFACE_THICKNESS = 28;
const PIXELS_PER_METER = (SURFACE_HALF * 2) / SURFACE_LENGTH_M;
const BLOCK_W = 220;
const BLOCK_H = 108;
const STREAK_COUNT = 8;
const SNAPSHOT_MS = 80;
const HATCH_SPACING = 36;
const PLANE_ORIGIN = { x: ORIGIN_X, y: ORIGIN_Y };

const LEGEND_CORE = [
  { color: VECTOR_COLORS.applied, label: 'F — сила тяги' },
  { color: VECTOR_COLORS.friction, label: 'Fтр — сила трения' },
  { color: VECTOR_COLORS.acceleration, label: 'a — ускорение' },
];

const LEGEND_FORCES_BASE = [
  { color: VECTOR_COLORS.weight, label: 'mg' },
  { color: VECTOR_COLORS.normal, label: 'N' },
];

const LEGEND_INCLINE = [
  { color: VECTOR_COLORS.along, label: 'mg sin α' },
  { color: VECTOR_COLORS.perp, label: 'mg cos α' },
];

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
      const pauseButtonRef = useRef<HTMLButtonElement>(null);
      const pauseTextRef = useRef<HTMLSpanElement>(null);
      const pauseIconRef = useRef<HTMLSpanElement>(null);
      const playIconRef = useRef<HTMLSpanElement>(null);
      const paramsRef = useRef(params);
      const showForcesRef = useRef(showForces);
      const onSnapshotRef = useRef(onSnapshot);
      const motionRef = useRef<MotionState>({ ...INITIAL_MOTION });
      const visualAngleRef = useRef(0);
      const visualScaleRef = useRef(massToVisualScale(params.mass));
      const hatchOffsetRef = useRef(0);
      const pausedRef = useRef(false);
      const epochRef = useRef(0);
      const lastSnapshotRef = useRef(0);

      paramsRef.current = params;
      showForcesRef.current = showForces;
      onSnapshotRef.current = onSnapshot;

      const applyPausedUi = (paused: boolean) => {
        pausedRef.current = paused;
        const button = pauseButtonRef.current;
        if (button) {
          button.setAttribute(
            'aria-label',
            paused ? 'Продолжить симуляцию' : 'Пауза',
          );
        }
        if (pauseTextRef.current) {
          pauseTextRef.current.textContent = paused ? 'Пуск' : 'Пауза';
        }
        if (pauseIconRef.current) {
          pauseIconRef.current.hidden = paused;
        }
        if (playIconRef.current) {
          playIconRef.current.hidden = !paused;
        }
      };

      useImperativeHandle(ref, () => ({
        reset: () => {
          epochRef.current += 1;
          motionRef.current = { ...INITIAL_MOTION };
          visualAngleRef.current = 0;
          visualScaleRef.current = massToVisualScale(FRICTION_DEFAULT_PARAMS.mass);
          hatchOffsetRef.current = 0;
          lastSnapshotRef.current = 0;
          applyPausedUi(false);
        },
      }));

      const handleFrame = useCallback((dt: number, now: number) => {
        const epoch = epochRef.current;
        const currentParams = paramsRef.current;
        const targetAngle =
          currentParams.mode === 'inclined' ? currentParams.angleDeg : 0;
        visualAngleRef.current =
          Math.abs(targetAngle - visualAngleRef.current) < 0.08
            ? targetAngle
            : lerp(visualAngleRef.current, targetAngle, Math.min(1, dt * 8));

        const targetScale = massToVisualScale(currentParams.mass);
        visualScaleRef.current =
          Math.abs(targetScale - visualScaleRef.current) < 0.002
            ? targetScale
            : lerp(visualScaleRef.current, targetScale, Math.min(1, dt * 8));

        const currentMotion = sanitizeMotion(motionRef.current, FRICTION_BOUNDS);
        const stepped = pausedRef.current
          ? {
              motion: currentMotion,
              forces: createFrictionSnapshot(currentParams, currentMotion).forces,
              hitBound: null,
            }
          : stepFriction(currentParams, currentMotion, dt, FRICTION_BOUNDS);

        if (epoch !== epochRef.current) {
          return;
        }

        motionRef.current = sanitizeMotion(stepped.motion, FRICTION_BOUNDS);

        if (epoch !== epochRef.current) {
          motionRef.current = { ...INITIAL_MOTION };
          visualAngleRef.current = 0;
          visualScaleRef.current = massToVisualScale(FRICTION_DEFAULT_PARAMS.mass);
          hatchOffsetRef.current = 0;
          return;
        }

        if (!pausedRef.current) {
          hatchOffsetRef.current +=
            -finiteNumber(motionRef.current.velocity, 0) * PIXELS_PER_METER * dt;
        }

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
          {
            motion: motionRef.current,
            forces: stepped.forces,
            hitBound: stepped.hitBound,
          },
          visualAngleRef.current,
          visualScaleRef.current,
          showForcesRef.current,
          hatchOffsetRef.current,
        );

        if (epoch === epochRef.current && now - lastSnapshotRef.current >= SNAPSHOT_MS) {
          lastSnapshotRef.current = now;
          onSnapshotRef.current({
            motion: { ...motionRef.current },
            forces: stepped.forces,
            hitBound: stepped.hitBound,
          });
        }
      }, []);

      useSimulationLoop(handleFrame, { maxDt: MAX_FRAME_DT });

      return (
        <SimulationScene label="Симуляция силы трения" fitHeight className="h-full w-full">
          <div className="flex h-full min-h-0 w-full flex-col">
            <div className="relative min-h-0 w-full flex-1">
              <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
                <SimulationToolbar>
                  <button
                    ref={pauseButtonRef}
                    type="button"
                    onClick={() => applyPausedUi(!pausedRef.current)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-black/55 px-2.5 text-sm font-semibold text-zinc-300 backdrop-blur-sm transition hover:border-white/20 hover:text-white"
                    aria-label="Пауза"
                  >
                    <span ref={pauseIconRef}>
                      <Pause className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span ref={playIconRef} hidden>
                      <Play className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span ref={pauseTextRef}>Пауза</span>
                  </button>
                </SimulationToolbar>
              </div>
              <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[calc(100%-6.5rem)] space-y-1.5 sm:left-3 sm:top-3">
                <p
                  ref={statusRef}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-xs font-semibold text-zinc-200 backdrop-blur-sm"
                >
                  <span
                    ref={statusDotRef}
                    className="h-1.5 w-1.5 rounded-full bg-zinc-400"
                    aria-hidden
                  />
                  <span ref={statusTextRef}>Тело покоится</span>
                </p>
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/55 p-1.5 text-[11px] backdrop-blur-sm sm:text-xs">
                  <HudCell label="v" valueRef={velocityRef} initial="0.00 м/с" />
                  <HudCell label="a" valueRef={accelRef} initial="0.00 м/с²" />
                  <HudCell label="Fтр" valueRef={frictionRef} initial="0.00 Н" />
                </div>
              </div>

              <div
                ref={angleBadgeRef}
                className="pointer-events-none absolute right-2 top-14 z-10 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-xs font-semibold tabular-nums text-zinc-200 backdrop-blur-sm sm:right-3"
                hidden
              >
                <span ref={angleBadgeTextRef}>α = 0°</span>
              </div>

              <svg
                ref={svgRef}
                viewBox={`${VIEW_BOX_X} ${VIEW_BOX_Y} ${VIEW_BOX_W} ${VIEW_BOX_H}`}
                preserveAspectRatio="xMidYMid meet"
                className="absolute inset-0 h-full w-full"
                role="img"
                aria-label="Брусок на поверхности с векторами сил"
              >
              <defs>
                <linearGradient id="friction-surface" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3A3F52" />
                  <stop offset="100%" stopColor="#161822" />
                </linearGradient>
              </defs>

              <line
                x1="48"
                y1={ORIGIN_Y + 1}
                x2={VIEW_W - 48}
                y2={ORIGIN_Y + 1}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1.5"
                strokeDasharray="10 12"
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
                  strokeWidth="2.4"
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
                      height={SURFACE_THICKNESS}
                      rx="2"
                    />
                  </clipPath>
                </defs>
                <g>
                  <rect
                    x={-SURFACE_HALF}
                    y="0"
                    width={SURFACE_HALF * 2}
                    height={SURFACE_THICKNESS}
                    rx="2"
                    fill="url(#friction-surface)"
                  />
                  <g ref={hatchRef} clipPath="url(#friction-surface-clip)">
                    {Array.from({ length: 48 }, (_, index) => {
                      const x = -SURFACE_HALF - 48 + index * HATCH_SPACING;
                      return (
                        <line
                          key={index}
                          x1={x}
                          y1="3"
                          x2={x + 11}
                          y2={SURFACE_THICKNESS - 3}
                          stroke="rgba(255,255,255,0.14)"
                          strokeWidth="1.8"
                        />
                      );
                    })}
                  </g>
                  <rect
                    x={-SURFACE_HALF}
                    y="-1"
                    width={SURFACE_HALF * 2}
                    height="3"
                    fill="rgba(147,197,253,0.2)"
                  />
                </g>

                <g ref={blockRef}>
                  <rect
                    x={-BLOCK_W / 2 + 6}
                    y="4"
                    width={BLOCK_W - 12}
                    height="8"
                    rx="4"
                    fill="rgba(0,0,0,0.4)"
                  />
                  <rect
                    x={-BLOCK_W / 2}
                    y={-BLOCK_H}
                    width={BLOCK_W}
                    height={BLOCK_H}
                    rx="2"
                    fill="#3166F0"
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth="1.25"
                  />
                  <text
                    ref={massLabelRef}
                    x="0"
                    y={-BLOCK_H / 2 + 6}
                    textAnchor="middle"
                    fill="white"
                    fontSize="22"
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
            </div>

            <div className="relative z-10 shrink-0 border-t border-white/5 px-3 py-1.5 sm:px-4">
              <SimulationLegend
                items={
                  showForces
                    ? [
                        ...LEGEND_CORE,
                        ...LEGEND_FORCES_BASE,
                        ...(params.mode === 'inclined' ? LEGEND_INCLINE : []),
                      ]
                    : LEGEND_CORE
                }
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
      <span className="block text-[10px] font-medium tracking-[0.04em] text-zinc-500">
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
  visualScale: number,
  showForces: boolean,
  hatchOffset: number,
) {
  const { motion, forces } = snapshot;
  const scroll = wrapRange(finiteNumber(hatchOffset, 0), HATCH_SPACING);
  const scale = finiteNumber(visualScale, 1);
  const blockH = BLOCK_H * scale;

  if (refs.block) {
    refs.block.setAttribute('transform', `scale(${scale})`);
  }

  if (refs.world) {
    refs.world.setAttribute(
      'transform',
      `translate(${ORIGIN_X} ${ORIGIN_Y}) rotate(${finiteNumber(visualAngle, 0)})`,
    );
  }

  if (refs.hatch) {
    refs.hatch.setAttribute('transform', `translate(${finiteNumber(scroll, 0)} 0)`);
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
    refs.status.className = `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-sm sm:text-sm ${
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

  const centerY = -blockH / 2;
  const appliedLen = forceVectorLength(forces.appliedForce);
  const frictionLen = forceVectorLength(forces.friction);
  const accelLen = forces.isResting
    ? 0
    : accelerationVectorLength(forces.acceleration);
  const extra = showForces;
  const incline = params.mode === 'inclined';
  const planeAngle = finiteNumber(visualAngle, 0);

  const appliedAngle = forces.appliedForce >= 0 ? 0 : 180;
  const frictionAngle = forces.friction >= 0 ? 0 : 180;
  const accelAngle = forces.acceleration >= 0 ? 0 : 180;
  const alongAngle = forces.gravityAlong >= 0 ? 0 : 180;
  const normalLen = extra ? forceVectorLength(forces.normal) : 0;
  const alongLen =
    extra && incline ? forceVectorLength(forces.gravityAlong) : 0;
  const perpLen =
    extra && incline ? forceVectorLength(forces.gravityPerp) : 0;
  const weightLen = extra ? forceVectorLength(forces.weight) : 0;

  const appliedLabel = `F = ${formatNewtons(Math.abs(forces.appliedForce))}`;
  const frictionLabel = `Fтр = ${formatNewtons(Math.abs(forces.friction))}`;
  const accelLabel = `a = ${formatAcceleration(forces.acceleration)}`;
  const normalLabel = `N = ${formatNewtons(forces.normal)}`;
  const alongLabel = `mg sin α = ${formatNewtons(Math.abs(forces.gravityAlong))}`;
  const perpLabel = `mg cos α = ${formatNewtons(forces.gravityPerp)}`;
  const weightLabel = `mg = ${formatNewtons(forces.weight)}`;

  const weightOrigin = worldFromLocal(
    { x: 0, y: centerY },
    PLANE_ORIGIN,
    planeAngle,
  );

  let labelOverrides: Record<string, LabelPoint> = {};

  if (incline) {
    const tipAt = (
      angleDeg: number,
      length: number,
      origin: LabelPoint,
    ): LabelPoint => {
      const rad = (angleDeg * Math.PI) / 180;
      return {
        x: origin.x + Math.cos(rad) * length,
        y: origin.y + Math.sin(rad) * length,
      };
    };

    const localOrigin = { x: 0, y: centerY };
    const worldOrigin = worldFromLocal(localOrigin, PLANE_ORIGIN, planeAngle);
    const worldAngle = (localAngleDeg: number) => localAngleDeg + planeAngle;

    const requests: TipLabelRequest[] = [];
    const push = (
      id: string,
      localAngleDeg: number,
      length: number,
      text: string,
      side: 1 | -1,
      options?: {
        originWorld?: LabelPoint;
        absoluteAngle?: boolean;
        preferredAlong?: number;
      },
    ) => {
      if (!(length > 1)) {
        return;
      }
      const originWorld = options?.originWorld ?? worldOrigin;
      const angleDeg = options?.absoluteAngle
        ? localAngleDeg
        : worldAngle(localAngleDeg);
      const tip = tipAt(angleDeg, length, originWorld);
      requests.push({
        id,
        text,
        tipX: tip.x,
        tipY: tip.y,
        angleDeg,
        side,
        preferredAlong: options?.preferredAlong,
      });
    };

    // World-space tips so mg (drawn outside the rotated group) collides correctly.
    push('applied', appliedAngle, appliedLen, appliedLabel, -1, {
      preferredAlong: 20,
    });
    push('friction', frictionAngle, frictionLen, frictionLabel, 1);
    push('normal', -90, normalLen, normalLabel, -1);
    push('weight', 90, weightLen, weightLabel, 1, {
      originWorld: weightOrigin,
      absoluteAngle: true,
      preferredAlong: 36,
    });
    push('along', alongAngle, alongLen, alongLabel, 1, {
      preferredAlong: -48,
    });
    push('perp', 90, perpLen, perpLabel, -1, {
      preferredAlong: -32,
    });

    const worldPlacements = placeLabelsNearTips(requests);
    for (const [id, point] of Object.entries(worldPlacements)) {
      labelOverrides[id] =
        id === 'weight' ? point : localFromWorld(point, PLANE_ORIGIN, planeAngle);
    }
  }

  const labelPos = (id: string) =>
    labelOverrides[id]
      ? { labelX: labelOverrides[id].x, labelY: labelOverrides[id].y }
      : {};
  const upright =
    incline && Math.abs(planeAngle) > 0.2
      ? { labelCounterRotateDeg: planeAngle }
      : {};

  setVectorArrow(refs.world, 'applied', {
    x: 0,
    y: centerY,
    angleDeg: appliedAngle,
    length: appliedLen,
    label: appliedLabel,
    labelSide: -1,
    ...labelPos('applied'),
    ...upright,
  });

  setVectorArrow(refs.world, 'friction', {
    x: 0,
    y: centerY,
    angleDeg: frictionAngle,
    length: frictionLen,
    label: frictionLabel,
    labelSide: 1,
    ...labelPos('friction'),
    ...upright,
  });

  setVectorArrow(refs.world, 'accel', {
    x: 0,
    y: -blockH - 72,
    angleDeg: accelAngle,
    length: accelLen,
    label: accelLabel,
    labelSide: -1,
    ...upright,
  });

  setVectorArrow(refs.world, 'normal', {
    x: 0,
    y: centerY,
    angleDeg: -90,
    length: normalLen,
    label: normalLabel,
    labelSide: -1,
    ...labelPos('normal'),
    ...upright,
  });
  setVectorArrow(refs.world, 'along', {
    x: 0,
    y: centerY,
    angleDeg: alongAngle,
    length: alongLen,
    label: alongLabel,
    labelSide: 1,
    ...labelPos('along'),
    ...upright,
  });
  setVectorArrow(refs.world, 'perp', {
    x: 0,
    y: centerY,
    angleDeg: 90,
    length: perpLen,
    label: perpLabel,
    labelSide: -1,
    ...labelPos('perp'),
    ...upright,
  });

  setVectorArrow(refs.svg, 'weight', {
    x: weightOrigin.x,
    y: weightOrigin.y,
    angleDeg: 90,
    length: weightLen,
    label: weightLabel,
    labelSide: 1,
    ...labelPos('weight'),
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

  const speed = Math.abs(finiteNumber(velocity, 0));
  const visible = speed > 0.08;
  const length = Math.min(140, 28 + speed * 18);
  const opacity = Math.min(0.4, speed / 8);
  const angleRad = (finiteNumber(visualAngle, 0) * Math.PI) / 180;
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

    const along = blockX + dir * (36 + index * 20);
    const localX1 = along;
    const localX2 = along + dir * length * (1 - index * 0.07);
    const localY = -16 - (index % 3) * 10;
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
