'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { SimulationPage } from '@/components/tools/simulations/SimulationPage';
import { SimulationShell } from '@/components/tools/simulations/SimulationShell';
import { FrictionControls } from '@/components/tools/simulations/friction/FrictionControls';
import {
  FrictionScene,
  type FrictionSceneHandle,
} from '@/components/tools/simulations/friction/FrictionScene';
import { getBreadcrumbs } from '@/lib/tools/navigation';
import { FRICTION_DEFAULT_PARAMS } from '@/lib/tools/simulations/friction/constants';
import { createFrictionSnapshot } from '@/lib/tools/simulations/friction/physics';
import type {
  FrictionParams,
  FrictionSnapshot,
} from '@/lib/tools/simulations/friction/types';

const FRICTION_PATH = '/tools/mechanics/dynamics/friction';

export function FrictionSimulation() {
  const sceneRef = useRef<FrictionSceneHandle>(null);
  const [params, setParams] = useState<FrictionParams>(FRICTION_DEFAULT_PARAMS);
  const [showForces, setShowForces] = useState(false);
  const [snapshot, setSnapshot] = useState<FrictionSnapshot>(() =>
    createFrictionSnapshot(FRICTION_DEFAULT_PARAMS),
  );

  const breadcrumbs = useMemo(() => getBreadcrumbs(FRICTION_PATH), []);

  const handleReset = useCallback(() => {
    setParams(FRICTION_DEFAULT_PARAMS);
    setShowForces(false);
    setSnapshot(createFrictionSnapshot(FRICTION_DEFAULT_PARAMS));
    sceneRef.current?.reset();
  }, []);

  return (
    <SimulationPage
      title="Сила трения"
      subtitle="Исследуйте зависимость силы трения от массы тела, коэффициента трения, приложенной силы и угла наклона."
      breadcrumbs={breadcrumbs}
      fitViewport
    >
      <SimulationShell
        fillWorkspace
        fitViewport
        scene={
          <FrictionScene
            ref={sceneRef}
            params={params}
            showForces={showForces}
            onSnapshot={setSnapshot}
          />
        }
        controls={
          <FrictionControls
            params={params}
            showForces={showForces}
            snapshot={snapshot}
            onParamsChange={setParams}
            onShowForcesChange={setShowForces}
            onReset={handleReset}
          />
        }
      />
    </SimulationPage>
  );
}
