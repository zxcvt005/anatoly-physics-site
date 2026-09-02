import { finiteNumber } from '@/lib/tools/simulations/math';

const DEFAULT_MAX_DT = 1 / 30;

export type SimulationFrame = (dt: number, now: number) => void;

export type SimulationClockOptions = {
  getMaxDt?: () => number;
  now?: () => number;
  requestFrame?: (callback: (time: number) => void) => number;
  cancelFrame?: (id: number) => void;
};

export type SimulationClock = {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
};

export function createSimulationClock(
  getOnFrame: () => SimulationFrame,
  options: SimulationClockOptions = {},
): SimulationClock {
  let rafId = 0;
  let cancelled = true;
  let lastTime = 0;

  const requestFrame =
    options.requestFrame ??
    ((callback: (time: number) => void) => window.requestAnimationFrame(callback));
  const cancelFrame =
    options.cancelFrame ??
    ((id: number) => window.cancelAnimationFrame(id));
  const now = options.now ?? (() => performance.now());

  const tick = (time: number) => {
    if (cancelled) {
      return;
    }

    const rawDt = finiteNumber((time - lastTime) / 1000, 0);
    lastTime = time;
    const maxDt = finiteNumber(options.getMaxDt?.() ?? DEFAULT_MAX_DT, DEFAULT_MAX_DT);
    const dt = rawDt > 0 ? Math.min(rawDt, Math.max(maxDt, 0)) : 0;
    getOnFrame()(dt, time);

    if (cancelled) {
      return;
    }

    rafId = requestFrame(tick);
  };

  const start = () => {
    if (!cancelled) {
      return;
    }

    cancelled = false;
    lastTime = now();
    rafId = requestFrame(tick);
  };

  const stop = () => {
    cancelled = true;
    cancelFrame(rafId);
    rafId = 0;
  };

  return {
    start,
    stop,
    isRunning: () => !cancelled,
  };
}
