'use client';

import type { RefObject } from 'react';
import { mapToRange } from '@/lib/tools/simulations/kinematics/scales';
import { formatTick } from '@/lib/tools/simulations/kinematics/physics';
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

const PAD = { left: 44, right: 14, top: 18, bottom: 28 };
const W = 420;
const H = 150;

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
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const toX = (t: number) =>
    PAD.left + mapToRange(t, timeScale.min, timeScale.max, 0, plotW);
  const toY = (v: number) =>
    PAD.top + mapToRange(v, valueScale.max, valueScale.min, 0, plotH);

  const path = samples
    .map((sample, index) => {
      const x = toX(sample.t);
      const y = toY(sample.value);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const zeroY =
    valueScale.min <= 0 && valueScale.max >= 0 ? toY(0) : null;
  const markerX = toX(currentTime);
  const markerY = toY(currentValue);

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
                x2={W - PAD.right}
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
              <text
                x={x}
                y={H - 8}
                textAnchor="middle"
                fill="rgba(161,161,170,0.9)"
                fontSize="9"
              >
                {formatTick(tick)}
              </text>
            </g>
          );
        })}

        {zeroY !== null && (
          <line
            x1={PAD.left}
            y1={zeroY}
            x2={W - PAD.right}
            y2={zeroY}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1.2"
          />
        )}

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
          x={W - PAD.right}
          y={H - 8}
          textAnchor="end"
          fill="rgba(161,161,170,0.85)"
          fontSize="9"
        >
          t, с
        </text>
      </svg>
    </div>
  );
}
