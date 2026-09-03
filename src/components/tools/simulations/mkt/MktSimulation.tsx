'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { SimulationPage } from '@/components/tools/simulations/SimulationPage';
import { SimulationShell } from '@/components/tools/simulations/SimulationShell';
import { MktControls } from '@/components/tools/simulations/mkt/MktControls';
import {
  MktScene,
  type MktSceneHandle,
} from '@/components/tools/simulations/mkt/MktScene';
import { getBreadcrumbs } from '@/lib/tools/navigation';
import { MKT_DEFAULT_PARAMS } from '@/lib/tools/simulations/mkt/constants';
import { createMktSnapshot } from '@/lib/tools/simulations/mkt/physics';
import type { MktParams, MktSnapshot } from '@/lib/tools/simulations/mkt/types';

export const MKT_PATH = '/tools/molecular-physics/mkt';

export function MktSimulation() {
  const sceneRef = useRef<MktSceneHandle>(null);
  const [params, setParams] = useState<MktParams>(MKT_DEFAULT_PARAMS);
  const [snapshot, setSnapshot] = useState<MktSnapshot>(() =>
    createMktSnapshot(MKT_DEFAULT_PARAMS),
  );

  const breadcrumbs = useMemo(() => getBreadcrumbs(MKT_PATH), []);

  const handleReset = useCallback(() => {
    setParams(MKT_DEFAULT_PARAMS);
    setSnapshot(createMktSnapshot(MKT_DEFAULT_PARAMS));
    sceneRef.current?.reset();
  }, []);

  return (
    <SimulationPage
      title="Газ и молекулы"
      subtitle="Исследуйте связь между хаотическим движением молекул, температурой, объёмом, количеством вещества и давлением идеального газа."
      breadcrumbs={breadcrumbs}
    >
      <SimulationShell
        scene={
          <MktScene
            ref={sceneRef}
            params={params}
            onParamsChange={setParams}
            onSnapshot={setSnapshot}
          />
        }
        controls={
          <MktControls
            params={params}
            snapshot={snapshot}
            onParamsChange={setParams}
            onReset={handleReset}
          />
        }
      />
    </SimulationPage>
  );
}
