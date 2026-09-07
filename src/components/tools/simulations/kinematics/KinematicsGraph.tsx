'use client';

import type { RefObject } from 'react';
import { GRAPH_ZERO_ABOVE_FRACTION } from '@/lib/tools/simulations/kinematics/constants';
import { formatTick } from '@/lib/tools/simulations/kinematics/physics';
import {
  mapToRange,
  mapValueToAsymmetricY,
} from '@/lib/tools/simulations/kinematics/scales';
import type { NiceScale } from '@/lib/tools/simulations/kinematics/types';

type GraphPoint = { t: number; value: number };

type KinematicsGraphProps = {
  title: string;
  yLabel: string;
  samples: GraphPoint[];
  timeScale: NiceScale;
  valueScale: NiceScale;
  currentTime: number;
  currentValue: number;
  stroke: string;
  markerRef?: RefObject<SVGGElement | null>;
};

/** Shared with the scene so rAF marker updates match the SVG layout. */
export const GRAPH_LAYOUT = {
  W: 420,
  H: 156,
  PAD: { left: 44, right: 30, top: 16, bottom: 28 },
  /** Reserved space on the right for the “t, с” unit label. */
  UNIT_RESERVE: 26,
  ZERO_ABOVE_FRACTION: GRAPH_ZERO_ABOVE_FRACTION,
} as const;

export function graphTimeToX(t: number, timeScale: NiceScale): number {
  const { PAD, W, UNIT_RESERVE } = GRAPH_LAYOUT;
  const plotW = W - PAD.left - PAD.right - UNIT_RESERVE;
  return PAD.left + mapToRange(t, timeScale.min, timeScale.max, 0, plotW);
}

export function graphValueToY(value: number, valueScale: NiceScale): number {
  const { PAD, H, ZERO_ABOVE_FRACTION } = GRAPH_LAYOUT;
  const plotH = H - PAD.top - PAD.bottom;
  return mapValueToAsymmetricY(
    value,
    valueScale,
    PAD.top,
    plotH,
    ZERO_ABOVE_FRACTION,
  );
}

export function KinematicsGraph({
  title,
  yLabel,
  samples,
  timeScale,
  valueScale,
  currentTime,
  currentValue,
  stroke,
  markerRef,
}: KinematicsGraphProps) {
  const { W, H, PAD, UNIT_RESERVE } = GRAPH_LAYOUT;
  const plotW = W - PAD.left - PAD.right - UNIT_RESERVE;
  const plotRight = PAD.left + plotW;

  const toX = (t: number) => graphTimeToX(t, timeScale);
  const toY = (v: number) => graphValueToY(v, valueScale);

  const path = samples
    .map((sample, index) => {
      const x = toX(sample.t);
      const y = toY(sample.value);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const zeroY = toY(0);
  const markerX = toX(currentTime);
  const markerY = toY(currentValue);
  const labelCutoffX = plotRight - 8;

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/35 px-2 pb-1 pt-1.5">
      <div className="mb-0.5 flex items-baseline justify-between gap-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {title}
        </p>
        <p className="text-[10px] text-zinc-500">{yLabel}</p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={title}
      >
        {valueScale.ticks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={`y-${tick}`}>
              <line
                x1={PAD.left}
                y1={y}
                x2={plotRight}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                fill="rgba(161,161,170,0.9)"
                fontSize="9"
              >
                {formatTick(tick)}
              </text>
            </g>
          );
        })}

        {timeScale.ticks.map((tick) => {
          const x = toX(tick);
          const showLabel = x <= labelCutoffX;
          return (
            <g key={`t-${tick}`}>
              <line
                x1={x}
                y1={PAD.top}
                x2={x}
                y2={H - PAD.bottom}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
              {showLabel && (
                <text
                  x={x}
                  y={H - 8}
                  textAnchor="middle"
                  fill="rgba(161,161,170,0.9)"
                  fontSize="9"
                >
                  {formatTick(tick)}
                </text>
              )}
            </g>
          );
        })}

        <line
          x1={PAD.left}
          y1={zeroY}
          x2={plotRight}
          y2={zeroY}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.2"
        />

        <path d={path} fill="none" stroke={stroke} strokeWidth="2.4" />

        <g ref={markerRef}>
          <line
            x1={markerX}
            y1={PAD.top}
            x2={markerX}
            y2={H - PAD.bottom}
            stroke="rgba(147,197,253,0.55)"
            strokeWidth="1.25"
            strokeDasharray="3 3"
          />
          <circle
            cx={markerX}
            cy={markerY}
            r="5"
            fill={stroke}
            stroke="#07080d"
            strokeWidth="2"
          />
        </g>

        <text
          x={W - 8}
          y={H - 8}
          textAnchor="end"
          fill="rgba(161,161,170,0.9)"
          fontSize="9"
        >
          t, с
        </text>
      </svg>
    </div>
  );
}
