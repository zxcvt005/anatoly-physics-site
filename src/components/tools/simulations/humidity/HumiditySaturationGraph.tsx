'use client';

import { useMemo } from 'react';
import { buildSaturationCurveSamples } from '@/lib/tools/simulations/humidity/saturation';
import { saturationPressureKPa } from '@/lib/tools/simulations/humidity/saturation';

const LAYOUT = {
  W: 360,
  H: 520,
  PAD: { left: 42, right: 16, top: 18, bottom: 36 },
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
  const axisX = PAD.left;
  const axisY = PAD.top + plotH;

  const xTicks = [0, 20, 40, 60, 80, 100];
  const yTicks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-2xl border border-white/10 bg-black/35 px-2.5 pb-1.5 pt-2">
      <div className="mb-1 flex shrink-0 items-baseline justify-between gap-2 px-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          Насыщение Pнас(T)
        </p>
        <p className="text-[10px] font-normal text-zinc-500">кПа</p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full max-lg:max-h-64 lg:h-full lg:min-h-0 lg:flex-1"
        preserveAspectRatio="xMidYMid meet"
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
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                fill="rgba(161,161,170,0.85)"
                fontSize="11"
                fontWeight="400"
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
                y2={PAD.top + plotH + 5}
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={H - 10}
                textAnchor="middle"
                fill="rgba(161,161,170,0.85)"
                fontSize="11"
                fontWeight="400"
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
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
        />
        <line
          x1={PAD.left}
          y1={PAD.top + plotH}
          x2={PAD.left + plotW}
          y2={PAD.top + plotH}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
        />
        <path
          d={path}
          fill="none"
          stroke="#60A5FA"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <line
          x1={markerX}
          y1={markerY}
          x2={markerX}
          y2={axisY}
          stroke="rgba(147,197,253,0.45)"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />
        <line
          x1={markerX}
          y1={markerY}
          x2={axisX}
          y2={markerY}
          stroke="rgba(147,197,253,0.45)"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />

        <circle
          cx={markerX}
          cy={markerY}
          r="5.5"
          fill="#93C5FD"
          stroke="#07080d"
          strokeWidth="2"
        />
        <text
          x={PAD.left + plotW}
          y={H - 10}
          textAnchor="end"
          fill="rgba(161,161,170,0.7)"
          fontSize="11"
          fontWeight="400"
        >
          T, °C
        </text>
      </svg>
    </div>
  );
}
