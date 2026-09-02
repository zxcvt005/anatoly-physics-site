'use client';

import { useEffect, useRef } from 'react';
import { createSimulationClock } from '@/lib/tools/simulations/simulation-clock';

type FrameCallback = (dt: number, now: number) => void;

type UseSimulationLoopOptions = {
  maxDt?: number;
};

export function useSimulationLoop(
  onFrame: FrameCallback,
  options: UseSimulationLoopOptions = {},
): void {
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const maxDtRef = useRef(options.maxDt ?? 1 / 30);
  maxDtRef.current = options.maxDt ?? 1 / 30;

  useEffect(() => {
    const clock = createSimulationClock(() => onFrameRef.current, {
      getMaxDt: () => maxDtRef.current,
    });
    clock.start();
    return () => clock.stop();
  }, []);
}
