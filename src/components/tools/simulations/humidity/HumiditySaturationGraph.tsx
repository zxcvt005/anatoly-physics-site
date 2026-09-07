'use client';

import { useMemo } from 'react';
import { buildSaturationCurveSamples } from '@/lib/tools/simulations/humidity/saturation';
import { saturationPressureKPa } from '@/lib/tools/simulations/humidity/saturation';

const LAYOUT = {
  W: 420,
  H: 180,
  PAD: { left: 44, right: 18, top: 14, bottom: 30 },
} as const;

function mapRange(
  value: number,
  d0: number,
  d1: number,
  r0: number,
  r1: number,
): number {
  if (Math.abs(d1 - d0) < 1e-12) {
    return (r0 + r1) / 2;
  }
  return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

type HumiditySaturationGraphProps = {
  temperatureC: number;
};

export function HumiditySaturationGraph({
  temperatureC,
}: HumiditySaturationGraphProps) {
  const samples = useMemo(() => buildSaturationCurveSamples(0.5), []);
  const { W, H, PAD } = LAYOUT;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const pMax = 110;

  const toX = (t: number) => PAD.left + mapRange(t, 0, 100, 0, plotW);
  const toY = (p: number) => PAD.top + mapRange(p, pMax, 0, 0, plotH);

  const path = samples
    .map((sample, index) => {
      const x = toX(sample.tC);
      const y = toY(sample.pSatKPa);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const markerX = toX(temperatureC);
  const markerY = toY(saturationPressureKPa(temperatureC));

  const xTicks = [0, 20, 40, 60, 80, 100];
  const yTicks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/35 px-2 pb-1 pt-1.5">
      <div className="mb-0.5 flex items-baseline justify-between gap-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Насыщение Pнас(T)
        </p>
        <p className="text-[10px] text-zinc-500">кПа</p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Кривая насыщения водяного пара"
      >
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={`y-${tick}`}>
              <line
                x1={PAD.left}
                y1={y}
                x2={PAD.left + plotW}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                fill="rgba(161,161,170,0.9)"
                fontSize="10"
              >
                {tick}
              </text>
            </g>
          );
        })}
        {xTicks.map((tick) => {
          const x = toX(tick);
          return (
            <g key={`x-${tick}`}>
              <line
                x1={x}
                y1={PAD.top + plotH}
                x2={x}
                y2={PAD.top + plotH + 4}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={H - 8}
                textAnchor="middle"
                fill="rgba(161,161,170,0.9)"
                fontSize="10"
              >
                {tick}
              </text>
            </g>
          );
        })}
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + plotH}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.5"
        />
        <line
          x1={PAD.left}
          y1={PAD.top + plotH}
          x2={PAD.left + plotW}
          y2={PAD.top + plotH}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.5"
        />
        <path
          d={path}
          fill="none"
          stroke="#60A5FA"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={markerX}
          cy={markerY}
          r="5"
          fill="#93C5FD"
          stroke="#07080d"
          strokeWidth="2"
        />
        <text
          x={PAD.left + plotW}
          y={H - 8}
          textAnchor="end"
          fill="rgba(161,161,170,0.75)"
          fontSize="10"
        >
          T, °C
        </text>
      </svg>
    </div>
  );
}
