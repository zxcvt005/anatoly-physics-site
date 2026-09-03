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
  estimateLabelSize,
  layoutVectorLabels,
  localLabelFromWorld,
  rectFromCenter,
  worldFromLocal,
  type LabelPoint,
  type VectorLabelRequest,
} from '@/lib/tools/simulations/vector-label-layout';

const VIEW_W = 1120;
const VIEW_H = 920;
const ORIGIN_X = 560;
const ORIGIN_Y = 540;
const SURFACE_HALF = 500;
const SURFACE_THICKNESS = 28;
const PIXELS_PER_METER = (SURFACE_HALF * 2) / SURFACE_LENGTH_M;
const BLOCK_W = 220;
const BLOCK_H = 108;
const STREAK_COUNT = 8;
const SNAPSHOT_MS = 80;
const HATCH_SPACING = 36;
const FORCE_LABEL_PREVIOUS: Record<string, LabelPoint | undefined> = {};
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
        <SimulationScene label="Симуляция силы трения">
          <div className="relative">
            <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
              <SimulationToolbar>
                <button
                  ref={pauseButtonRef}
                  type="button"
                  onClick={() => applyPausedUi(!pausedRef.current)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/55 px-3 text-sm font-semibold text-zinc-300 backdrop-blur-sm transition hover:border-white/20 hover:text-white"
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
            <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-7rem)] space-y-2 sm:left-4 sm:top-4">
              <p
                ref={statusRef}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-semibold text-zinc-200 backdrop-blur-sm sm:text-sm"
              >
                <span
                  ref={statusDotRef}
                  className="h-1.5 w-1.5 rounded-full bg-zinc-400"
                  aria-hidden
                />
                <span ref={statusTextRef}>Тело покоится</span>
              </p>
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-black/55 p-2 text-[11px] backdrop-blur-sm sm:text-sm">
                <HudCell label="v" valueRef={velocityRef} initial="0.00 м/с" />
                <HudCell label="a" valueRef={accelRef} initial="0.00 м/с²" />
                <HudCell label="Fтр" valueRef={frictionRef} initial="0.00 Н" />
              </div>
            </div>

            <div
              ref={angleBadgeRef}
              className="pointer-events-none absolute right-3 top-16 z-10 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-semibold tabular-nums text-zinc-200 backdrop-blur-sm sm:right-4 sm:text-sm"
              hidden
            >
              <span ref={angleBadgeTextRef}>α = 0°</span>
            </div>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="block h-auto w-full overflow-visible"
              style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
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

            <div className="relative z-10 border-t border-white/5 px-4 py-3">
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
    const tip = (
      origin: LabelPoint,
      angleDeg: number,
      length: number,
    ): LabelPoint => {
      const rad = (angleDeg * Math.PI) / 180;
      return {
        x: origin.x + Math.cos(rad) * length,
        y: origin.y + Math.sin(rad) * length,
      };
    };

    // Layout in plane-local space so AABB packing matches label x/y in the rotated group.
    const localOrigin = { x: 0, y: centerY };
    const weightLocalAngle = 90 - planeAngle;

    const requests: VectorLabelRequest[] = [];
    const pushRequest = (
      id: string,
      priority: number,
      angleDeg: number,
      length: number,
      text: string,
      preferredSide: 1 | -1,
      preferredAlongFrac: number,
      originLocal: LabelPoint = localOrigin,
    ) => {
      if (!(length > 1)) {
        return;
      }
      const tipLocal = tip(originLocal, angleDeg, length);
      requests.push({
        id,
        priority,
        originX: originLocal.x,
        originY: originLocal.y,
        tipX: tipLocal.x,
        tipY: tipLocal.y,
        angleDeg,
        length,
        text,
        preferredSide,
        preferredAlongFrac,
      });
    };

    // Spread coincident shafts (F vs mg sin α) along different fractions.
    pushRequest('applied', 1, appliedAngle, appliedLen, appliedLabel, -1, 0.78);
    pushRequest('friction', 2, frictionAngle, frictionLen, frictionLabel, 1, 0.58);
    pushRequest('normal', 3, -90, normalLen, normalLabel, -1, 0.72);
    pushRequest(
      'weight',
      4,
      weightLocalAngle,
      weightLen,
      weightLabel,
      -1,
      0.82,
    );
    pushRequest('along', 5, alongAngle, alongLen, alongLabel, -1, 0.42);
    // Keep mg cos α near the block (small alongFrac) so the label stays above the surface.
    pushRequest('perp', 6, 90, perpLen, perpLabel, -1, 0.18);

    const halfW = (BLOCK_W / 2) * scale;
    const obstacles = [
      {
        left: -halfW - 10,
        top: -blockH - 10,
        right: halfW + 10,
        bottom: 10,
      },
    ];

    if (accelLen > 1) {
      const accelOrigin = { x: 0, y: -blockH - 72 };
      const accelTip = tip(accelOrigin, accelAngle, accelLen);
      const accelLabelPoint = {
        x:
          accelOrigin.x +
          Math.cos((accelAngle * Math.PI) / 180) * (accelLen * 0.55) -
          Math.sin((accelAngle * Math.PI) / 180) * -46,
        y:
          accelOrigin.y +
          Math.sin((accelAngle * Math.PI) / 180) * (accelLen * 0.55) +
          Math.cos((accelAngle * Math.PI) / 180) * -46,
      };
      obstacles.push(rectFromCenter(accelLabelPoint, estimateLabelSize(accelLabel)));
      const bandHalfW = Math.max(90, accelLen * 0.6);
      obstacles.push({
        left: accelOrigin.x - bandHalfW,
        top: Math.min(accelOrigin.y, accelTip.y) - 40,
        right: accelOrigin.x + bandHalfW,
        bottom: Math.max(accelOrigin.y, accelTip.y) + 28,
      });
    }

    const viewCorners = [
      { x: 36, y: 36 },
      { x: VIEW_W - 36, y: 36 },
      { x: 36, y: VIEW_H - 36 },
      { x: VIEW_W - 36, y: VIEW_H - 36 },
    ].map((point) => localLabelFromWorld(point, PLANE_ORIGIN, planeAngle));
    const bounds = {
      left: Math.min(...viewCorners.map((p) => p.x)),
      top: Math.min(...viewCorners.map((p) => p.y)),
      right: Math.max(...viewCorners.map((p) => p.x)),
      bottom: Math.max(...viewCorners.map((p) => p.y)),
    };

    const localPlacements = layoutVectorLabels(
      {
        requests,
        obstacles,
        bounds,
        previous: FORCE_LABEL_PREVIOUS,
        planeAngleDeg: 0,
      },
      { x: 0, y: 0 },
    );

    for (const [id, point] of Object.entries(localPlacements)) {
      FORCE_LABEL_PREVIOUS[id] = point;
      if (id === 'weight') {
        labelOverrides[id] = worldFromLocal(point, PLANE_ORIGIN, planeAngle);
      } else {
        labelOverrides[id] = point;
      }
    }
  } else {
    for (const key of Object.keys(FORCE_LABEL_PREVIOUS)) {
      delete FORCE_LABEL_PREVIOUS[key];
    }
  }

  const labelPos = (id: string) =>
    labelOverrides[id]
      ? { labelX: labelOverrides[id].x, labelY: labelOverrides[id].y }
      : {};
  const upright = incline && Math.abs(planeAngle) > 0.2
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
    labelSide: 1,
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
