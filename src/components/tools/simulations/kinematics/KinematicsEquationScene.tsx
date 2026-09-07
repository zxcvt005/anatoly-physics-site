'use client';

import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  GRAPH_LAYOUT,
  graphTimeToX,
  graphValueToY,
  KinematicsGraph,
} from '@/components/tools/simulations/kinematics/KinematicsGraph';
import { SimulationScene } from '@/components/tools/simulations/SimulationScene';
import {
  VECTOR_COLORS,
  VectorArrow,
  setVectorArrow,
} from '@/components/tools/simulations/VectorArrow';
import { useSimulationLoop } from '@/components/tools/simulations/useSimulationLoop';
import { MAX_FRAME_DT, PLAYBACK_SPEED } from '@/lib/tools/simulations/kinematics/constants';
import {
  accelerationArrowLength,
  buildScales,
  buildTrailVisual,
  formatNumber,
  formatTick,
  formatVectorLabel,
  liveStateAt,
  positionAt,
  sampleGraphs,
  velocityArrowLength,
  velocityAt,
} from '@/lib/tools/simulations/kinematics/physics';
import { mapToRange } from '@/lib/tools/simulations/kinematics/scales';
import type {
  KinematicsLiveState,
  KinematicsParams,
} from '@/lib/tools/simulations/kinematics/types';

export type KinematicsEquationSceneHandle = {
  reset: () => void;
};

type KinematicsEquationSceneProps = {
  params: KinematicsParams;
  isPlaying: boolean;
  live: KinematicsLiveState;
  onLiveChange: (live: KinematicsLiveState) => void;
  onFinished: () => void;
};

const AXIS_W = 900;
const AXIS_H = 150;
const AXIS_PAD_X = 48;
const AXIS_Y = 58;
const ACCEL_OFFSET_Y = -36;
const VELOCITY_COLOR = '#2EE9C8';
const HUD_VALUE_CLASS =
  'inline-block min-w-[5.5ch] text-right font-semibold tabular-nums text-white';

export const KinematicsEquationScene = memo(
  forwardRef<KinematicsEquationSceneHandle, KinematicsEquationSceneProps>(
    function KinematicsEquationScene(
      { params, isPlaying, live, onLiveChange, onFinished },
      ref,
    ) {
      const scales = useMemo(() => buildScales(params), [params]);
      const samples = useMemo(() => sampleGraphs(params), [params]);

      const timeRef = useRef(live.time);
      const playingRef = useRef(isPlaying);
      const paramsRef = useRef(params);
      const onLiveChangeRef = useRef(onLiveChange);
      const onFinishedRef = useRef(onFinished);
      const lastHudRef = useRef(0);
      const scalesRef = useRef(scales);

      const worldRef = useRef<SVGGElement>(null);
      const bodyRef = useRef<SVGGElement>(null);
      const startPointRef = useRef<SVGCircleElement>(null);
      const trailGroupRef = useRef<SVGGElement>(null);
      const xMarkerRef = useRef<SVGGElement>(null);
      const vMarkerRef = useRef<SVGGElement>(null);
      const hudTimeRef = useRef<HTMLSpanElement>(null);
      const hudXRef = useRef<HTMLSpanElement>(null);
      const hudVRef = useRef<HTMLSpanElement>(null);
      const hudARef = useRef<HTMLSpanElement>(null);

      paramsRef.current = params;
      playingRef.current = isPlaying;
      onLiveChangeRef.current = onLiveChange;
      onFinishedRef.current = onFinished;
      scalesRef.current = scales;

      const toAxisX = (x: number) =>
        AXIS_PAD_X +
        mapToRange(x, scales.x.min, scales.x.max, 0, AXIS_W - AXIS_PAD_X * 2);

      function paintFrame(t: number) {
        const current = paramsRef.current;
        const liveScales = scalesRef.current;
        const x = positionAt(current, t);
        const v = velocityAt(current, t);

        const axisX =
          AXIS_PAD_X +
          mapToRange(
            x,
            liveScales.x.min,
            liveScales.x.max,
            0,
            AXIS_W - AXIS_PAD_X * 2,
          );

        if (bodyRef.current) {
          bodyRef.current.setAttribute(
            'transform',
            `translate(${axisX} ${AXIS_Y})`,
          );
        }

        const toX = (value: number) =>
          AXIS_PAD_X +
          mapToRange(
            value,
            liveScales.x.min,
            liveScales.x.max,
            0,
            AXIS_W - AXIS_PAD_X * 2,
          );

        const trail = buildTrailVisual(current, t, toX, AXIS_Y);
        const trailGroup = trailGroupRef.current;
        if (trailGroup) {
          trailGroup
            .querySelectorAll('[data-trail-segment="true"]')
            .forEach((node) => node.remove());
          trail.segments.forEach((d, index) => {
            const path = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'path',
            );
            path.setAttribute('data-trail-segment', 'true');
            path.setAttribute('d', d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', index === 0 ? '#F87171' : '#FB7185');
            path.setAttribute('stroke-width', index === 0 ? '2.4' : '2.6');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            trailGroup.appendChild(path);
          });
        }

        if (startPointRef.current) {
          startPointRef.current.setAttribute('cx', String(toX(current.x0)));
          startPointRef.current.setAttribute('cy', String(AXIS_Y));
        }

        const vLen = velocityArrowLength(v);
        const vDir = v >= 0 ? 1 : -1;
        setVectorArrow(worldRef.current, 'velocity', {
          x: axisX,
          y: AXIS_Y,
          angleDeg: v >= 0 ? 0 : 180,
          length: vLen,
          label: formatVectorLabel('v', v, 'м/с'),
          labelSide: 1,
          labelY: AXIS_Y + 20,
          labelX: axisX + vDir * Math.max(vLen * 0.45, 18),
        });

        const aLen = accelerationArrowLength(current.a);
        const aDir = current.a >= 0 ? 1 : -1;
        setVectorArrow(worldRef.current, 'accel', {
          x: axisX,
          y: AXIS_Y + ACCEL_OFFSET_Y,
          angleDeg: current.a >= 0 ? 0 : 180,
          length: aLen,
          label: formatVectorLabel('a', current.a, 'м/с²'),
          labelSide: -1,
          labelY: AXIS_Y + ACCEL_OFFSET_Y - 14,
          labelX: axisX + aDir * Math.max(aLen * 0.45, 18),
        });

        const xMarker = xMarkerRef.current;
        if (xMarker) {
          const mx = graphTimeToX(t, liveScales.time);
          const my = graphValueToY(x, liveScales.x);
          const line = xMarker.querySelector('line');
          const circle = xMarker.querySelector('circle');
          line?.setAttribute('x1', String(mx));
          line?.setAttribute('x2', String(mx));
          line?.setAttribute('y1', String(GRAPH_LAYOUT.PAD.top));
          line?.setAttribute(
            'y2',
            String(GRAPH_LAYOUT.H - GRAPH_LAYOUT.PAD.bottom),
          );
          circle?.setAttribute('cx', String(mx));
          circle?.setAttribute('cy', String(my));
        }

        const vMarker = vMarkerRef.current;
        if (vMarker) {
          const mx = graphTimeToX(t, liveScales.time);
          const my = graphValueToY(v, liveScales.v);
          const line = vMarker.querySelector('line');
          const circle = vMarker.querySelector('circle');
          line?.setAttribute('x1', String(mx));
          line?.setAttribute('x2', String(mx));
          line?.setAttribute('y1', String(GRAPH_LAYOUT.PAD.top));
          line?.setAttribute(
            'y2',
            String(GRAPH_LAYOUT.H - GRAPH_LAYOUT.PAD.bottom),
          );
          circle?.setAttribute('cx', String(mx));
          circle?.setAttribute('cy', String(my));
        }

        if (hudTimeRef.current) {
          hudTimeRef.current.textContent = formatNumber(t);
        }
        if (hudXRef.current) {
          hudXRef.current.textContent = formatNumber(x);
        }
        if (hudVRef.current) {
          hudVRef.current.textContent = formatNumber(v);
        }
        if (hudARef.current) {
          hudARef.current.textContent = formatNumber(current.a);
        }
      }

      useEffect(() => {
        timeRef.current = live.time;
        if (!isPlaying) {
          paintFrame(live.time);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [live.time, isPlaying, params, scales]);

      useEffect(() => {
        timeRef.current = 0;
        paintFrame(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [params.x0, params.v0, params.a, params.duration]);

      useImperativeHandle(ref, () => ({
        reset: () => {
          timeRef.current = 0;
          paintFrame(0);
          onLiveChangeRef.current(liveStateAt(paramsRef.current, 0));
        },
      }));

      useSimulationLoop((dt, now) => {
        if (!playingRef.current) {
          return;
        }

        const current = paramsRef.current;
        const duration = Math.max(0, current.duration);
        let next = timeRef.current + dt * PLAYBACK_SPEED;

        if (next >= duration) {
          next = duration;
          timeRef.current = next;
          paintFrame(next);
          onLiveChangeRef.current(liveStateAt(current, next));
          playingRef.current = false;
          onFinishedRef.current();
          return;
        }

        timeRef.current = next;
        paintFrame(next);

        if (now - lastHudRef.current > 80) {
          lastHudRef.current = now;
          onLiveChangeRef.current(liveStateAt(current, next));
        }
      }, { maxDt: MAX_FRAME_DT });

      const zeroAxisX =
        AXIS_PAD_X +
        mapToRange(0, scales.x.min, scales.x.max, 0, AXIS_W - AXIS_PAD_X * 2);

      return (
        <SimulationScene
          label="Работа с уравнением движения"
          fitHeight
          className="h-full w-full"
        >
          <div className="flex h-full min-h-0 flex-col gap-2 p-2 sm:p-3">
            <div className="grid shrink-0 grid-cols-1 gap-2 lg:grid-cols-2">
              <KinematicsGraph
                title="x(t)"
                yLabel="x, м"
                samples={samples.map((s) => ({ t: s.t, value: s.x }))}
                timeScale={scales.time}
                valueScale={scales.x}
                currentTime={live.time}
                currentValue={live.x}
                stroke="#60A5FA"
                markerRef={xMarkerRef}
              />
              <KinematicsGraph
                title="v(t)"
                yLabel="v, м/с"
                samples={samples.map((s) => ({ t: s.t, value: s.v }))}
                timeScale={scales.time}
                valueScale={scales.v}
                currentTime={live.time}
                currentValue={live.v}
                stroke="#2EE9C8"
                markerRef={vMarkerRef}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-xs text-zinc-400 sm:text-sm">
              <span className="inline-flex items-baseline gap-1.5">
                <span>t =</span>
                <span ref={hudTimeRef} className={HUD_VALUE_CLASS}>
                  {formatNumber(live.time)}
                </span>
                <span>с</span>
              </span>
              <span className="inline-flex items-baseline gap-1.5">
                <span>x =</span>
                <span ref={hudXRef} className={HUD_VALUE_CLASS}>
                  {formatNumber(live.x)}
                </span>
                <span>м</span>
              </span>
              <span className="inline-flex items-baseline gap-1.5">
                <span>v =</span>
                <span ref={hudVRef} className={HUD_VALUE_CLASS}>
                  {formatNumber(live.v)}
                </span>
                <span>м/с</span>
              </span>
              <span className="inline-flex items-baseline gap-1.5">
                <span>a =</span>
                <span ref={hudARef} className={HUD_VALUE_CLASS}>
                  {formatNumber(params.a)}
                </span>
                <span>м/с²</span>
              </span>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              <svg
                viewBox={`0 0 ${AXIS_W} ${AXIS_H}`}
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Координатная прямая"
              >
                <line
                  x1={AXIS_PAD_X}
                  y1={AXIS_Y}
                  x2={AXIS_W - AXIS_PAD_X}
                  y2={AXIS_Y}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="2"
                />
                <polygon
                  points={`${AXIS_W - AXIS_PAD_X + 10},${AXIS_Y} ${AXIS_W - AXIS_PAD_X - 4},${AXIS_Y - 6} ${AXIS_W - AXIS_PAD_X - 4},${AXIS_Y + 6}`}
                  fill="rgba(255,255,255,0.45)"
                />
                <text
                  x={AXIS_W - 18}
                  y={AXIS_Y - 10}
                  fill="rgba(212,212,216,0.9)"
                  fontSize="14"
                  fontWeight="600"
                >
                  x
                </text>

                <line
                  x1={zeroAxisX}
                  y1={AXIS_Y - 10}
                  x2={zeroAxisX}
                  y2={AXIS_Y + 10}
                  stroke="rgba(147,197,253,0.7)"
                  strokeWidth="2"
                />

                {scales.x.ticks.map((tick) => {
                  const tickX = toAxisX(tick);
                  return (
                    <g key={tick}>
                      <line
                        x1={tickX}
                        y1={AXIS_Y - 6}
                        x2={tickX}
                        y2={AXIS_Y + 6}
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth="1.5"
                      />
                      <text
                        x={tickX}
                        y={AXIS_Y + 22}
                        textAnchor="middle"
                        fill="rgba(161,161,170,0.95)"
                        fontSize="11"
                      >
                        {formatTick(tick)}
                      </text>
                    </g>
                  );
                })}

                <g ref={trailGroupRef} />

                <circle
                  ref={startPointRef}
                  cx={toAxisX(params.x0)}
                  cy={AXIS_Y}
                  r="5"
                  fill="#93C5FD"
                  stroke="#07080d"
                  strokeWidth="2"
                />

                <g ref={worldRef}>
                  <VectorArrow
                    id="accel"
                    color={VECTOR_COLORS.acceleration}
                    label="a"
                    compact
                  />
                  <VectorArrow
                    id="velocity"
                    color={VELOCITY_COLOR}
                    label="v"
                    compact
                  />

                  <g
                    ref={bodyRef}
                    transform={`translate(${toAxisX(live.x)} ${AXIS_Y})`}
                  >
                    <rect
                      x="-14"
                      y="-12"
                      width="28"
                      height="24"
                      rx="4"
                      fill="#3166F0"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="1.25"
                    />
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </SimulationScene>
      );
    },
  ),
);
