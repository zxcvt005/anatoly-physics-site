'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { SimulationPage } from '@/components/tools/simulations/SimulationPage';
import { SimulationShell } from '@/components/tools/simulations/SimulationShell';
import { HumidityControls } from '@/components/tools/simulations/humidity/HumidityControls';
import {
  HumidityScene,
  type HumiditySceneHandle,
} from '@/components/tools/simulations/humidity/HumidityScene';
import { HumiditySaturationGraph } from '@/components/tools/simulations/humidity/HumiditySaturationGraph';
import { getBreadcrumbs } from '@/lib/tools/navigation';
import { HUMIDITY_DEFAULT_PARAMS } from '@/lib/tools/simulations/humidity/constants';
import {
  createHumiditySnapshot,
  patchParams,
  sanitizeParams,
} from '@/lib/tools/simulations/humidity/physics';
import type { HumidityParams } from '@/lib/tools/simulations/humidity/types';

export const HUMIDITY_PATH = '/tools/molecular-physics/humidity';

export function HumiditySimulation() {
  const sceneRef = useRef<HumiditySceneHandle>(null);
  const [params, setParams] = useState<HumidityParams>(() =>
    sanitizeParams(HUMIDITY_DEFAULT_PARAMS),
  );

  const snapshot = useMemo(() => createHumiditySnapshot(params), [params]);
  const breadcrumbs = useMemo(() => getBreadcrumbs(HUMIDITY_PATH), []);

  const handleParamsChange = useCallback((next: HumidityParams) => {
    setParams(sanitizeParams(next));
  }, []);

  const handleReset = useCallback(() => {
    setParams(sanitizeParams(HUMIDITY_DEFAULT_PARAMS));
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
          <div className="flex h-full min-h-0 w-full flex-col gap-3 lg:flex-row lg:gap-3">
            <aside className="order-2 flex w-full shrink-0 flex-col lg:order-1 lg:h-full lg:w-[min(28%,17.5rem)] lg:overflow-hidden">
              <div className="min-h-0 lg:flex lg:h-full lg:items-stretch">
                <HumiditySaturationGraph temperatureC={params.temperatureC} />
              </div>
            </aside>
            <div className="order-1 min-h-0 min-w-0 flex-1 lg:order-2">
              <HumidityScene ref={sceneRef} snapshot={snapshot} />
            </div>
          </div>
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
