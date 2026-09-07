'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { SimulationPage } from '@/components/tools/simulations/SimulationPage';
import { SimulationShell } from '@/components/tools/simulations/SimulationShell';
import { HumidityControls } from '@/components/tools/simulations/humidity/HumidityControls';
import {
  HumidityScene,
  type HumiditySceneHandle,
} from '@/components/tools/simulations/humidity/HumidityScene';
import { getBreadcrumbs } from '@/lib/tools/navigation';
import { HUMIDITY_DEFAULT_PARAMS } from '@/lib/tools/simulations/humidity/constants';
import {
  createHumiditySnapshot,
  patchParams,
  sanitizeParams,
} from '@/lib/tools/simulations/humidity/physics';
import type { HumidityParams, HumiditySnapshot } from '@/lib/tools/simulations/humidity/types';

export const HUMIDITY_PATH = '/tools/molecular-physics/humidity';

export function HumiditySimulation() {
  const sceneRef = useRef<HumiditySceneHandle>(null);
  const [params, setParams] = useState<HumidityParams>(() =>
    sanitizeParams(HUMIDITY_DEFAULT_PARAMS),
  );
  const [snapshot, setSnapshot] = useState<HumiditySnapshot>(() =>
    createHumiditySnapshot(HUMIDITY_DEFAULT_PARAMS),
  );

  const breadcrumbs = useMemo(() => getBreadcrumbs(HUMIDITY_PATH), []);

  const handleParamsChange = useCallback((next: HumidityParams) => {
    const sanitized = sanitizeParams(next);
    setParams(sanitized);
    setSnapshot(createHumiditySnapshot(sanitized));
  }, []);

  const handleReset = useCallback(() => {
    const defaults = sanitizeParams(HUMIDITY_DEFAULT_PARAMS);
    setParams(defaults);
    setSnapshot(createHumiditySnapshot(defaults));
    sceneRef.current?.reset();
  }, []);

  return (
    <SimulationPage
      title="Влажность"
      subtitle="Насыщенный водяной пар, конденсация и испарение при изменении объёма и температуры."
      breadcrumbs={breadcrumbs}
      fitViewport
    >
      <SimulationShell
        fillWorkspace
        fitViewport
        controlsWide
        scene={
          <HumidityScene
            ref={sceneRef}
            params={params}
            snapshot={snapshot}
          />
        }
        controls={
          <HumidityControls
            params={params}
            snapshot={snapshot}
            onParamsChange={handleParamsChange}
            onReset={handleReset}
          />
        }
      />
    </SimulationPage>
  );
}

/** Helper retained for tests that patch through the public API. */
export function applyHumidityPatch(
  current: HumidityParams,
  partial: Partial<HumidityParams>,
): HumidityParams {
  return patchParams(current, partial);
}
