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
  HumidityParticle,
  HumiditySnapshot,
} from '@/lib/tools/simulations/humidity/types';

export type HumiditySceneHandle = {
  reset: () => void;
};

type HumiditySceneProps = {
  snapshot: HumiditySnapshot;
};

const PARTICLE_COLOR = '#7DD3FC';
const HUD_VALUE =
  'inline-block min-w-[4.5ch] text-right font-semibold tabular-nums text-white';

type VesselGeo = {
  innerLeft: number;
  innerWidth: number;
  bottom: number;
  pistonBottom: number;
  liquidTop: number;
  gasTop: number;
  gasHeight: number;
};

function vesselGeometry(volumeM3: number, liquidMassKg: number): VesselGeo {
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
  const gasHeight = Math.max(12, liquidTop - gasTop);

  return {
    innerLeft,
    innerWidth,
    bottom,
    pistonBottom,
    liquidTop,
    gasTop,
    gasHeight,
  };
}

function drawFrame(
  canvas: HTMLCanvasElement,
  snap: HumiditySnapshot,
  particles: HumidityParticle[],
  transferMode: 'none' | 'condense' | 'evaporate',
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const w = VESSEL.width;
  const h = VESSEL.height;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const geo = vesselGeometry(snap.volumeM3, snap.liquidMassKg);
  ctx.clearRect(0, 0, w, h);

  const wallX = VESSEL.padX - VESSEL.wall;
  const wallW = w - 2 * wallX;
  const wallY = VESSEL.padTop;
  const wallH = h - VESSEL.padTop - VESSEL.padBottom + 4;

  ctx.fillStyle = 'rgba(12,18,32,0.95)';
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, wallX, wallY, wallW, wallH, 10);
  ctx.fill();
  ctx.stroke();

  const liquidH = Math.max(0, geo.bottom - geo.liquidTop);
  if (liquidH > 0.5 && snap.liquidMassKg > 1e-12) {
    const gradient = ctx.createLinearGradient(0, geo.liquidTop, 0, geo.bottom);
    gradient.addColorStop(0, 'rgba(56,189,248,0.55)');
    gradient.addColorStop(1, 'rgba(2,132,199,0.85)');
    ctx.fillStyle = gradient;
    ctx.fillRect(geo.innerLeft, geo.liquidTop, geo.innerWidth, liquidH);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(geo.innerLeft, geo.gasTop, geo.innerWidth, geo.gasHeight);
  ctx.clip();
  ctx.fillStyle = PARTICLE_COLOR;
  ctx.globalAlpha = 0.9;
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(geo.innerLeft + p.x, geo.gasTop + p.y, 3.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (transferMode !== 'none') {
    const color = transferMode === 'condense' ? '#38BDF8' : '#FDE68A';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const frac of [0.22, 0.5, 0.78]) {
      const x = geo.innerLeft + geo.innerWidth * frac;
      const y =
        geo.gasTop + geo.gasHeight * (transferMode === 'condense' ? 0.55 : 0.7);
      ctx.beginPath();
      if (transferMode === 'condense') {
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y + 10);
        ctx.moveTo(x - 4, y + 4);
        ctx.lineTo(x, y + 10);
        ctx.lineTo(x + 4, y + 4);
      } else {
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x, y - 10);
        ctx.moveTo(x - 4, y - 4);
        ctx.lineTo(x, y - 10);
        ctx.lineTo(x + 4, y - 4);
      }
      ctx.stroke();
    }
  }

  const pistonY = geo.pistonBottom - VESSEL.pistonHeight;
  ctx.fillStyle = '#3166F0';
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.25;
  roundRectPath(
    ctx,
    geo.innerLeft - 4,
    pistonY,
    geo.innerWidth + 8,
    VESSEL.pistonHeight,
    3,
  );
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w / 2, pistonY - 28);
  ctx.lineTo(w / 2, pistonY);
  ctx.stroke();

  ctx.fillStyle = 'rgba(161,161,170,0.9)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `V = ${formatHumidityNumber(snap.volumeM3, 2)} м³`,
    w / 2,
    h - 10,
  );
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export const HumidityScene = memo(
  forwardRef<HumiditySceneHandle, HumiditySceneProps>(function HumidityScene(
    { snapshot },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<HumidityParticle[]>([]);
    const snapshotRef = useRef(snapshot);
    const prevLiquidRef = useRef(snapshot.liquidMassKg);
    const transferModeRef = useRef<'none' | 'condense' | 'evaporate'>('none');
    const transferTimerRef = useRef(0);
    const lastCountRef = useRef(-1);

    const hudTRef = useRef<HTMLSpanElement>(null);
    const hudPRef = useRef<HTMLSpanElement>(null);
    const hudRhoRef = useRef<HTMLSpanElement>(null);
    const hudNRef = useRef<HTMLSpanElement>(null);
    const hudVRef = useRef<HTMLSpanElement>(null);
    const hudMRef = useRef<HTMLSpanElement>(null);
    const hudPSatRef = useRef<HTMLSpanElement>(null);
    const hudRhoSatRef = useRef<HTMLSpanElement>(null);
    const hudPhaseRef = useRef<HTMLSpanElement>(null);

    snapshotRef.current = snapshot;

    const syncFromSnapshot = (snap: HumiditySnapshot) => {
      const geo = vesselGeometry(snap.volumeM3, snap.liquidMassKg);
      const count = vaporMassToVisualCount(snap.vaporMassKg, snap.volumeM3);
      if (
        lastCountRef.current !== count ||
        particlesRef.current.length !== count
      ) {
        particlesRef.current = syncParticles(
          particlesRef.current,
          count,
          geo.innerWidth,
          geo.gasHeight,
        );
        lastCountRef.current = count;
      } else {
        // Keep particles inside the current gas box when V changes.
        for (const p of particlesRef.current) {
          if (p.x > geo.innerWidth) p.x = geo.innerWidth;
          if (p.y > geo.gasHeight) p.y = geo.gasHeight;
        }
      }

      const delta = snap.liquidMassKg - prevLiquidRef.current;
      if (delta > 1e-6) {
        transferModeRef.current = 'condense';
        transferTimerRef.current = 0.85;
      } else if (delta < -1e-6) {
        transferModeRef.current = 'evaporate';
        transferTimerRef.current = 0.85;
      }
      prevLiquidRef.current = snap.liquidMassKg;
    };

    useImperativeHandle(ref, () => ({
      reset: () => {
        prevLiquidRef.current = 0;
        transferModeRef.current = 'none';
        transferTimerRef.current = 0;
        lastCountRef.current = -1;
        const snap = snapshotRef.current;
        const geo = vesselGeometry(snap.volumeM3, snap.liquidMassKg);
        const count = vaporMassToVisualCount(snap.vaporMassKg, snap.volumeM3);
        particlesRef.current = createParticles(
          count,
          geo.innerWidth,
          geo.gasHeight,
          42,
        );
        lastCountRef.current = count;
      },
    }));

    useEffect(() => {
      syncFromSnapshot(snapshot);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      snapshot.volumeM3,
      snapshot.vaporMassKg,
      snapshot.liquidMassKg,
      snapshot.temperatureC,
    ]);

    useSimulationLoop((dt) => {
      const snap = snapshotRef.current;
      const geo = vesselGeometry(snap.volumeM3, snap.liquidMassKg);

      stepParticles(particlesRef.current, dt, geo.innerWidth, geo.gasHeight);

      if (transferTimerRef.current > 0) {
        transferTimerRef.current = Math.max(0, transferTimerRef.current - dt);
        if (transferTimerRef.current <= 0) {
          transferModeRef.current = 'none';
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        drawFrame(
          canvas,
          snap,
          particlesRef.current,
          transferModeRef.current,
        );
      }

      if (hudTRef.current) {
        hudTRef.current.textContent = formatHumidityNumber(snap.temperatureC, 1);
      }
      if (hudPRef.current) {
        hudPRef.current.textContent = formatHumidityNumber(
          snap.vaporPressureKPa,
          3,
        );
      }
      if (hudRhoRef.current) {
        hudRhoRef.current.textContent = formatHumidityNumber(
          snap.vaporDensityKgM3,
          4,
        );
      }
      if (hudNRef.current) {
        hudNRef.current.textContent = formatHumidityNumber(
          snap.vaporConcentrationPerM3,
          2,
        );
      }
      if (hudVRef.current) {
        hudVRef.current.textContent = formatHumidityNumber(snap.volumeM3, 2);
      }
      if (hudMRef.current) {
        hudMRef.current.textContent = formatHumidityNumber(snap.totalMassKg, 4);
      }
      if (hudPSatRef.current) {
        hudPSatRef.current.textContent = formatHumidityNumber(snap.pSatKPa, 3);
      }
      if (hudRhoSatRef.current) {
        hudRhoSatRef.current.textContent = formatHumidityNumber(
          snap.rhoSatKgM3,
          4,
        );
      }
      if (hudPhaseRef.current) {
        hudPhaseRef.current.textContent = phaseLabel(snap.phase);
      }
    }, { maxDt: MAX_FRAME_DT });

    return (
      <SimulationScene
        label="Влажность водяного пара"
        fitHeight
        className="h-full w-full"
      >
        <div className="flex h-full min-h-0 flex-col gap-2 p-2 sm:p-3">
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-zinc-400 sm:text-xs">
            <span className="inline-flex items-baseline gap-1">
              <span>T =</span>
              <span ref={hudTRef} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.temperatureC, 1)}
              </span>
              <span>°C</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>P =</span>
              <span ref={hudPRef} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.vaporPressureKPa, 3)}
              </span>
              <span>кПа</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>ρ =</span>
              <span ref={hudRhoRef} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.vaporDensityKgM3, 4)}
              </span>
              <span>кг/м³</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>n =</span>
              <span ref={hudNRef} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.vaporConcentrationPerM3, 2)}
              </span>
              <span>1/м³</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>V =</span>
              <span ref={hudVRef} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.volumeM3, 2)}
              </span>
              <span>м³</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>m =</span>
              <span ref={hudMRef} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.totalMassKg, 4)}
              </span>
              <span>кг</span>
            </span>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-zinc-500 sm:text-xs">
            <span className="inline-flex items-baseline gap-1">
              <span>Pнас =</span>
              <span ref={hudPSatRef} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.pSatKPa, 3)}
              </span>
              <span>кПа</span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span>ρнас =</span>
              <span ref={hudRhoSatRef} className={HUD_VALUE}>
                {formatHumidityNumber(snapshot.rhoSatKgM3, 4)}
              </span>
              <span>кг/м³</span>
            </span>
            <span
              ref={hudPhaseRef}
              className="rounded-full border border-[#3166F0]/25 bg-[#3166F0]/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-100"
            >
              {phaseLabel(snapshot.phase)}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center">
            <canvas
              ref={canvasRef}
              width={VESSEL.width}
              height={VESSEL.height}
              className="h-full max-h-full w-auto max-w-full object-contain"
              aria-label="Сосуд с водяным паром под поршнем"
            />
          </div>
        </div>
      </SimulationScene>
    );
  }),
);
