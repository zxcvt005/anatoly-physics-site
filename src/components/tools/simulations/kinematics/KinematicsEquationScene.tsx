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
  formatAcceleration,
  formatMeters,
  formatMetersPerSecond,
  formatSeconds,
  formatTick,
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
const ACCEL_OFFSET_Y = -42;
const VELOCITY_COLOR = '#2EE9C8';

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
      const trailGroupRef = useRef<SVGGElement>(null);
      const trailStartArrowRef = useRef<SVGPolygonElement>(null);
      const trailEndArrowRef = useRef<SVGPolygonElement>(null);
      const xMarkerRef = useRef<SVGGElement>(null);
      const vMarkerRef = useRef<SVGGElement>(null);
      const hudTimeRef = useRef<HTMLSpanElement>(null);
      const hudXRef = useRef<HTMLSpanElement>(null);
      const hudVRef = useRef<HTMLSpanElement>(null);

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
          const insertBeforeNode = trailStartArrowRef.current;
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
            if (insertBeforeNode) {
              trailGroup.insertBefore(path, insertBeforeNode);
            } else {
              trailGroup.appendChild(path);
            }
          });
        }

        const startArrow = trailStartArrowRef.current;
        if (startArrow) {
          if (trail.startArrow) {
            startArrow.setAttribute('visibility', 'visible');
            startArrow.setAttribute(
              'transform',
              `translate(${trail.startArrow.x} ${trail.startArrow.y}) rotate(${trail.startArrow.angleDeg})`,
            );
          } else {
            startArrow.setAttribute('visibility', 'hidden');
          }
        }

        const endArrow = trailEndArrowRef.current;
        if (endArrow) {
          if (trail.endArrow) {
            endArrow.setAttribute('visibility', 'visible');
            endArrow.setAttribute(
              'transform',
              `translate(${trail.endArrow.x} ${trail.endArrow.y}) rotate(${trail.endArrow.angleDeg})`,
            );
          } else {
            endArrow.setAttribute('visibility', 'hidden');
          }
        }

        const vLen = velocityArrowLength(v);
        setVectorArrow(worldRef.current, 'velocity', {
          x: axisX,
          y: AXIS_Y,
          angleDeg: v >= 0 ? 0 : 180,
          length: vLen,
          label: 'v',
          labelSide: -1,
          labelY: AXIS_Y + (vLen > 0 ? 22 : 0),
          labelX: axisX + (v >= 0 ? vLen * 0.55 : -vLen * 0.55),
        });

        const aLen = accelerationArrowLength(current.a);
        setVectorArrow(worldRef.current, 'accel', {
          x: axisX,
          y: AXIS_Y + ACCEL_OFFSET_Y,
          angleDeg: current.a >= 0 ? 0 : 180,
          length: aLen,
          label: 'a',
          labelSide: -1,
          labelY: AXIS_Y + ACCEL_OFFSET_Y - 18,
          labelX: axisX + (current.a >= 0 ? aLen * 0.55 : -aLen * 0.55),
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
          hudTimeRef.current.textContent = formatSeconds(t);
        }
        if (hudXRef.current) {
          hudXRef.current.textContent = formatMeters(x);
        }
        if (hudVRef.current) {
          hudVRef.current.textContent = formatMetersPerSecond(v);
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

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs tabular-nums text-zinc-400 sm:text-sm">
              <span>
                t ={' '}
                <span ref={hudTimeRef} className="font-semibold text-white">
                  {formatSeconds(live.time)}
                </span>
              </span>
              <span>
                x ={' '}
                <span ref={hudXRef} className="font-semibold text-white">
                  {formatMeters(live.x)}
                </span>
              </span>
              <span>
                v ={' '}
                <span ref={hudVRef} className="font-semibold text-white">
                  {formatMetersPerSecond(live.v)}
                </span>
              </span>
              <span>
                a ={' '}
                <span className="font-semibold text-white">
                  {formatAcceleration(params.a)}
                </span>
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

                <g ref={trailGroupRef}>
                  <polygon
                    ref={trailStartArrowRef}
                    visibility="hidden"
                    points="0,-3.5 9,0 0,3.5"
                    fill="#F87171"
                  />
                  <polygon
                    ref={trailEndArrowRef}
                    visibility="hidden"
                    points="0,-3.5 9,0 0,3.5"
                    fill="#F87171"
                  />
                </g>

                <g ref={worldRef}>
                  <VectorArrow id="accel" color={VECTOR_COLORS.acceleration} label="a" />
                  <VectorArrow id="velocity" color={VELOCITY_COLOR} label="v" />

                  <g
                    ref={bodyRef}
                    transform={`translate(${toAxisX(live.x)} ${AXIS_Y})`}
                  >
                    <rect
                      x="-18"
                      y="-14"
                      width="36"
                      height="28"
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
