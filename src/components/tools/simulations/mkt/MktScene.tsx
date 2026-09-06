'use client';

import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Pause, Play } from 'lucide-react';
import { SimulationScene } from '@/components/tools/simulations/SimulationScene';
import { SimulationSegmentedControl } from '@/components/tools/simulations/SimulationSegmentedControl';
import { SimulationSlider } from '@/components/tools/simulations/SimulationSlider';
import { SimulationToolbar } from '@/components/tools/simulations/SimulationToolbar';
import { useSimulationLoop } from '@/components/tools/simulations/useSimulationLoop';
import { MktHeater } from '@/components/tools/simulations/mkt/MktHeater';
import {
  MAX_FRAME_DT,
  MKT_DEFAULT_PARAMS,
  MKT_RANGES,
  SNAPSHOT_MS,
  VESSEL_REF,
  VISUAL_PARTICLE_SCALE,
  WALL_FLASH_MS,
} from '@/lib/tools/simulations/mkt/constants';
import {
  applyHeater,
  buildRuntimeStats,
  computeMacroState,
  createImpulseWindow,
  createMktSnapshot,
  displayTemperature,
  experimentalPressureFromWindow,
  formatPressure,
  formatSpeed,
  formatTemperatureC,
  formatTemperatureK,
  recordImpulse,
  sanitizeParams,
  sanitizeTemperatureInput,
  stepParticles,
  syncParticlesToParams,
  vesselSizeForVolume,
} from '@/lib/tools/simulations/mkt/physics';
import type {
  MktParams,
  MktParticle,
  MktSnapshot,
  TemperatureUnit,
  VesselBounds,
  WallHitFlash,
} from '@/lib/tools/simulations/mkt/types';

export type MktSceneHandle = {
  reset: () => void;
};

type MktSceneProps = {
  params: MktParams;
  onParamsChange: (params: MktParams) => void;
  onSnapshot: (snapshot: MktSnapshot) => void;
};

export const MktScene = memo(
  forwardRef<MktSceneHandle, MktSceneProps>(function MktScene(
    { params, onParamsChange, onSnapshot },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const vesselWrapRef = useRef<HTMLDivElement>(null);
    const tempKRef = useRef<HTMLSpanElement>(null);
    const tempCRef = useRef<HTMLSpanElement>(null);
    const pressureRef = useRef<HTMLSpanElement>(null);
    const speedRef = useRef<HTMLSpanElement>(null);
    const countRef = useRef<HTMLSpanElement>(null);
    const pauseButtonRef = useRef<HTMLButtonElement>(null);
    const pauseTextRef = useRef<HTMLSpanElement>(null);
    const pauseIconRef = useRef<HTMLSpanElement>(null);
    const playIconRef = useRef<HTMLSpanElement>(null);

    const paramsRef = useRef(params);
    const onParamsChangeRef = useRef(onParamsChange);
    const onSnapshotRef = useRef(onSnapshot);
    const particlesRef = useRef<MktParticle[]>([]);
    const flashesRef = useRef<WallHitFlash[]>([]);
    const impulseWindowRef = useRef(createImpulseWindow());
    const wallHitsRef = useRef(0);
    const pausedRef = useRef(false);
    const epochRef = useRef(0);
    const lastSnapshotRef = useRef(0);
    const temperatureRef = useRef(params.temperatureK);
    const syncedKeyRef = useRef('');

    paramsRef.current = params;
    onParamsChangeRef.current = onParamsChange;
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

    const resetInternal = () => {
      epochRef.current += 1;
      const safe = sanitizeParams(MKT_DEFAULT_PARAMS);
      particlesRef.current = [];
      flashesRef.current = [];
      impulseWindowRef.current = createImpulseWindow();
      wallHitsRef.current = 0;
      lastSnapshotRef.current = 0;
      temperatureRef.current = safe.temperatureK;
      syncedKeyRef.current = '';
      applyPausedUi(false);
    };

    useImperativeHandle(ref, () => ({
      reset: resetInternal,
    }));

    const handleFrame = useCallback((dt: number, now: number) => {
      const epoch = epochRef.current;
      const currentParams = sanitizeParams(paramsRef.current);
      if (Math.abs(currentParams.heater) < 0.02) {
        temperatureRef.current = currentParams.temperatureK;
      } else if (!pausedRef.current) {
        temperatureRef.current = applyHeater(
          temperatureRef.current,
          currentParams.heater,
          dt,
        );
      }

      const liveParams: MktParams = {
        ...currentParams,
        temperatureK: temperatureRef.current,
      };

      const size = vesselSizeForVolume(liveParams.volumeL);
      const bounds: VesselBounds = {
        width: size.width,
        height: size.height,
        depthM: VESSEL_REF.depthM,
      };

      const syncKey = [
        liveParams.volumeL,
        liveParams.components.map((c) => `${c.id}:${c.gasId}:${c.moles}`).join('|'),
        Math.round(liveParams.temperatureK),
      ].join('/');

      if (syncedKeyRef.current !== syncKey) {
        particlesRef.current = syncParticlesToParams(
          particlesRef.current,
          liveParams,
          bounds,
        );
        syncedKeyRef.current = syncKey;
      }

      const stepped = pausedRef.current
        ? {
            particles: particlesRef.current,
            wallHitsDelta: 0,
            impulseSumNs: 0,
            flashes: [] as WallHitFlash[],
          }
        : stepParticles(
            particlesRef.current,
            dt,
            bounds,
            liveParams.temperatureK,
            now,
          );

      if (epoch !== epochRef.current) {
        return;
      }

      particlesRef.current = stepped.particles;
      if (stepped.wallHitsDelta > 0) {
        wallHitsRef.current += stepped.wallHitsDelta;
        recordImpulse(
          impulseWindowRef.current,
          now / 1000,
          stepped.impulseSumNs,
          stepped.wallHitsDelta,
        );
        flashesRef.current.push(...stepped.flashes);
      }

      flashesRef.current = flashesRef.current.filter(
        (flash) => now - flash.bornAt < WALL_FLASH_MS,
      );

      const canvas = canvasRef.current;
      if (canvas) {
        drawVessel(canvas, bounds, particlesRef.current, flashesRef.current, now);
      }

      const macro = computeMacroState(liveParams);
      const experimental = experimentalPressureFromWindow(
        impulseWindowRef.current,
        bounds,
        now / 1000,
      );
      const runtime = buildRuntimeStats({
        particles: particlesRef.current,
        macro,
        wallHits: wallHitsRef.current,
        wallHitsWindow: impulseWindowRef.current.samples.length,
        experimentalPressurePa: experimental,
      });

      if (tempKRef.current) {
        tempKRef.current.textContent = formatTemperatureK(liveParams.temperatureK);
      }
      if (tempCRef.current) {
        tempCRef.current.textContent = formatTemperatureC(liveParams.temperatureK);
      }
      if (pressureRef.current) {
        pressureRef.current.textContent = formatPressure(runtime.displayedPressurePa);
      }
      if (speedRef.current) {
        speedRef.current.textContent = formatSpeed(runtime.meanSpeedMps);
      }
      if (countRef.current) {
        countRef.current.textContent = String(runtime.visualMoleculeCount);
      }

      if (now - lastSnapshotRef.current >= SNAPSHOT_MS) {
        lastSnapshotRef.current = now;
        onSnapshotRef.current({
          macro,
          runtime,
          heater: liveParams.heater,
        });

        if (
          Math.abs(liveParams.temperatureK - currentParams.temperatureK) > 0.2
        ) {
          onParamsChangeRef.current({
            ...paramsRef.current,
            temperatureK: liveParams.temperatureK,
          });
        }
      }
    }, []);

    useSimulationLoop(handleFrame, { maxDt: MAX_FRAME_DT });

    const snapshot = createMktSnapshot(params);

    return (
      <SimulationScene label="Сосуд с идеальным газом" fitHeight className="h-full w-full">
        <div className="flex h-full min-h-0 flex-col">
          <div className="relative shrink-0 px-2.5 pt-2 sm:px-3 sm:pt-2.5">
            <div className="absolute right-2.5 top-2 z-10 sm:right-3 sm:top-2.5">
              <SimulationToolbar>
                <button
                  ref={pauseButtonRef}
                  type="button"
                  aria-label="Пауза"
                  onClick={() => applyPausedUi(!pausedRef.current)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-2.5 text-sm font-semibold text-zinc-200 transition hover:border-[#3166F0]/40 hover:text-white"
                >
                  <span ref={pauseIconRef}>
                    <Pause className="h-3.5 w-3.5" />
                  </span>
                  <span ref={playIconRef} hidden>
                    <Play className="h-3.5 w-3.5" />
                  </span>
                  <span ref={pauseTextRef}>Пауза</span>
                </button>
              </SimulationToolbar>
            </div>

            <div className="mr-24 grid grid-cols-2 gap-1.5">
              <ReadoutCard title="Температура">
                <span ref={tempKRef} className="block text-base font-semibold tabular-nums text-white sm:text-lg">
                  {formatTemperatureK(params.temperatureK)}
                </span>
                <span ref={tempCRef} className="mt-0.5 block text-[11px] tabular-nums text-zinc-400">
                  {formatTemperatureC(params.temperatureK)}
                </span>
              </ReadoutCard>
              <ReadoutCard title="Давление">
                <span ref={pressureRef} className="block text-base font-semibold tabular-nums text-white sm:text-lg">
                  {formatPressure(snapshot.runtime.displayedPressurePa)}
                </span>
              </ReadoutCard>
            </div>
          </div>

          <div
            ref={vesselWrapRef}
            className="relative flex min-h-0 flex-1 items-center justify-center px-2 py-0.5 sm:px-3"
          >
            <canvas
              ref={canvasRef}
              className="mx-auto block h-auto max-h-full w-full touch-manipulation object-contain"
              width={VESSEL_REF.viewW}
              height={280}
            />
          </div>

          <p className="shrink-0 px-3 pb-0.5 text-center text-[10px] tabular-nums text-zinc-500 sm:text-[11px]">
            Средняя скорость:{' '}
            <span ref={speedRef} className="text-zinc-300">
              {formatSpeed(snapshot.runtime.meanSpeedMps)}
            </span>
            {' · '}
            Молекул в модели:{' '}
            <span ref={countRef} className="text-zinc-300">
              {snapshot.runtime.visualMoleculeCount}
            </span>
          </p>

          <div className="shrink-0">
            <MktTemperatureDock
              params={params}
              onParamsChange={onParamsChange}
            />
          </div>
        </div>
      </SimulationScene>
    );
  }),
);

function MktTemperatureDock({
  params,
  onParamsChange,
}: {
  params: MktParams;
  onParamsChange: (params: MktParams) => void;
}) {
  const unit = params.temperatureUnit;
  const displayT = displayTemperature(params.temperatureK, unit);

  return (
    <div className="px-2.5 pb-2 sm:px-3">
      <MktHeater
        heater={params.heater}
        temperatureK={params.temperatureK}
        onHeaterChange={(heater) => onParamsChange({ ...params, heater })}
      />
      <div className="mx-auto mt-1.5 w-full max-w-md space-y-1.5">
        <SimulationSegmentedControl<TemperatureUnit>
          label="Единицы температуры"
          value={unit}
          onChange={(temperatureUnit) =>
            onParamsChange({ ...params, temperatureUnit })
          }
          options={[
            { value: 'K', label: 'K' },
            { value: 'C', label: '°C' },
          ]}
        />
        <SimulationSlider
          label="Установить температуру"
          value={displayT}
          min={
            unit === 'C'
              ? MKT_RANGES.temperatureC.min
              : MKT_RANGES.temperatureK.min
          }
          max={
            unit === 'C'
              ? MKT_RANGES.temperatureC.max
              : MKT_RANGES.temperatureK.max
          }
          step={1}
          displayValue={
            unit === 'C'
              ? formatTemperatureC(params.temperatureK)
              : formatTemperatureK(params.temperatureK)
          }
          onChange={(value) => {
            const temperatureK = sanitizeTemperatureInput(value, unit);
            onParamsChange({
              ...params,
              temperatureK,
              heater: temperatureK === 0 ? -1 : 0,
            });
          }}
        />
      </div>
    </div>
  );
}

function ReadoutCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {title}
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function drawVessel(
  canvas: HTMLCanvasElement,
  bounds: VesselBounds,
  particles: MktParticle[],
  flashes: WallHitFlash[],
  now: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const viewW = canvas.width;
  const viewH = canvas.height;
  ctx.clearRect(0, 0, viewW, viewH);

  const maxW = viewW - 32;
  const maxH = viewH - 28;
  const fit = Math.min(1, maxW / bounds.width, maxH / bounds.height);
  const w = bounds.width * fit;
  const h = bounds.height * fit;
  const x = (viewW - w) / 2;
  const y = (viewH - h) / 2;
  const r = VESSEL_REF.cornerRadius * fit;

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = 'rgba(12, 18, 32, 0.92)';
  ctx.fill();
  ctx.shadowColor = 'rgba(49, 102, 240, 0.22)';
  ctx.shadowBlur = 18;
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(49, 102, 240, 0.55)';
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();

  for (const particle of particles) {
    ctx.beginPath();
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = 0.92;
    ctx.arc(
      x + particle.x * fit,
      y + particle.y * fit,
      Math.max(2.2, particle.radius * VISUAL_PARTICLE_SCALE * fit),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  for (const flash of flashes) {
    const age = (now - flash.bornAt) / WALL_FLASH_MS;
    const alpha = Math.max(0, 1 - age);
    ctx.beginPath();
    ctx.fillStyle = `rgba(147, 197, 253, ${0.18 + alpha * 0.45})`;
    const fx = x + flash.x * fit;
    const fy = y + flash.y * fit;
    ctx.ellipse(fx, fy, 16 * fit, 10 * fit, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
