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
  buildSnapshotFromMasses,
  clampVolumeM3,
  createHumiditySnapshot,
  createPhaseMassesAllVapor,
  paramsFromRelativeHumidity,
  patchParams,
  sanitizeParams,
} from '@/lib/tools/simulations/humidity/physics';
import type {
  HumidityParams,
  HumiditySnapshot,
} from '@/lib/tools/simulations/humidity/types';

export const HUMIDITY_PATH = '/tools/molecular-physics/humidity';

export function HumiditySimulation() {
  const sceneRef = useRef<HumiditySceneHandle>(null);
  const [params, setParams] = useState<HumidityParams>(() =>
    sanitizeParams(HUMIDITY_DEFAULT_PARAMS),
  );
  const [customRhPercent, setCustomRhPercent] = useState<number | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState<HumiditySnapshot>(() =>
    buildSnapshotFromMasses(
      sanitizeParams(HUMIDITY_DEFAULT_PARAMS),
      createPhaseMassesAllVapor(sanitizeParams(HUMIDITY_DEFAULT_PARAMS)),
    ),
  );

  const breadcrumbs = useMemo(() => getBreadcrumbs(HUMIDITY_PATH), []);

  const handleParamsChange = useCallback((next: HumidityParams) => {
    setCustomRhPercent(null);
    setParams(sanitizeParams(next));
  }, []);

  const handleTemperatureChange = useCallback(
    (temperatureC: number) => {
      setParams((prev) => {
        let next = patchParams(prev, { temperatureC });
        if (customRhPercent !== null) {
          next = paramsFromRelativeHumidity(next, customRhPercent);
        }
        return next;
      });
    },
    [customRhPercent],
  );

  const handleVolumeChange = useCallback(
    (volumeM3: number) => {
      const capped = clampVolumeM3(volumeM3);
      setParams((prev) => {
        let next = patchParams(prev, { volumeM3: capped });
        if (customRhPercent !== null) {
          next = paramsFromRelativeHumidity(next, customRhPercent);
        }
        return next;
      });
    },
    [customRhPercent],
  );

  const handleApplyCustomRh = useCallback((rhPercent: number) => {
    setCustomRhPercent(rhPercent);
    setParams((prev) => paramsFromRelativeHumidity(prev, rhPercent));
    queueMicrotask(() => sceneRef.current?.reset());
  }, []);

  const handleClearCustomRh = useCallback(() => {
    setCustomRhPercent(null);
  }, []);

  const handleLiveSnapshot = useCallback((snapshot: HumiditySnapshot) => {
    setLiveSnapshot(snapshot);
  }, []);

  const handleReset = useCallback(() => {
    const defaults = sanitizeParams(HUMIDITY_DEFAULT_PARAMS);
    setCustomRhPercent(null);
    setParams(defaults);
    setLiveSnapshot(
      buildSnapshotFromMasses(defaults, createPhaseMassesAllVapor(defaults)),
    );
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
            <aside className="order-3 flex w-full shrink-0 flex-col max-lg:max-h-72 lg:order-1 lg:h-full lg:w-[min(34%,22rem)] lg:overflow-hidden">
              <div className="min-h-0 flex-1 lg:flex lg:h-full lg:items-stretch">
                <HumiditySaturationGraph temperatureC={params.temperatureC} />
              </div>
            </aside>
            <div className="order-1 min-h-0 min-w-0 flex-1 lg:order-2">
              <HumidityScene
                ref={sceneRef}
                params={params}
                volumeM3={params.volumeM3}
                onVolumeChange={handleVolumeChange}
                onLiveSnapshot={handleLiveSnapshot}
                liveRhPercent={liveSnapshot.relativeHumidityPercent}
                customRhPercent={customRhPercent}
                onApplyCustomRh={handleApplyCustomRh}
                onClearCustomRh={handleClearCustomRh}
              />
            </div>
          </div>
        }
        controls={
          <HumidityControls
            params={params}
            snapshot={liveSnapshot}
            onParamsChange={handleParamsChange}
            onTemperatureChange={handleTemperatureChange}
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

export function getEquilibriumSnapshot(params: HumidityParams): HumiditySnapshot {
  return createHumiditySnapshot(params);
}
