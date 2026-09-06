'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { SimulationPage } from '@/components/tools/simulations/SimulationPage';
import { SimulationShell } from '@/components/tools/simulations/SimulationShell';
import { KinematicsEquationControls } from '@/components/tools/simulations/kinematics/KinematicsEquationControls';
import {
  KinematicsEquationScene,
  type KinematicsEquationSceneHandle,
} from '@/components/tools/simulations/kinematics/KinematicsEquationScene';
import { getBreadcrumbs } from '@/lib/tools/navigation';
import { KINEMATICS_DEFAULT_PARAMS } from '@/lib/tools/simulations/kinematics/constants';
import {
  liveStateAt,
  sanitizeParams,
} from '@/lib/tools/simulations/kinematics/physics';
import type {
  KinematicsLiveState,
  KinematicsParams,
} from '@/lib/tools/simulations/kinematics/types';

export const KINEMATICS_EQUATION_PATH = '/tools/mechanics/kinematics/equation';

export function KinematicsEquationSimulation() {
  const sceneRef = useRef<KinematicsEquationSceneHandle>(null);
  const [params, setParams] = useState<KinematicsParams>(KINEMATICS_DEFAULT_PARAMS);
  const [live, setLive] = useState<KinematicsLiveState>(() =>
    liveStateAt(KINEMATICS_DEFAULT_PARAMS, 0),
  );
  const [isPlaying, setIsPlaying] = useState(false);

  const breadcrumbs = useMemo(
    () => getBreadcrumbs(KINEMATICS_EQUATION_PATH),
    [],
  );

  const handleParamsChange = useCallback((next: KinematicsParams) => {
    const sanitized = sanitizeParams(next);
    setParams(sanitized);
    setIsPlaying(false);
    setLive(liveStateAt(sanitized, 0));
    sceneRef.current?.reset();
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setLive(liveStateAt(params, 0));
    sceneRef.current?.reset();
  }, [params]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((current) => {
      if (current) {
        return false;
      }
      if (live.time >= params.duration && params.duration > 0) {
        setLive(liveStateAt(params, 0));
        sceneRef.current?.reset();
      }
      return true;
    });
  }, [live.time, params]);

  return (
    <SimulationPage
      title="Работа с уравнением"
      subtitle="Связь уравнения x(t) = x₀ + v₀t + at²/2 с графиками координаты, скорости и движением тела по прямой."
      breadcrumbs={breadcrumbs}
      fitViewport
    >
      <SimulationShell
        fillWorkspace
        fitViewport
        scene={
          <KinematicsEquationScene
            ref={sceneRef}
            params={params}
            isPlaying={isPlaying}
            live={live}
            onLiveChange={setLive}
            onFinished={() => setIsPlaying(false)}
          />
        }
        controls={
          <KinematicsEquationControls
            params={params}
            live={live}
            isPlaying={isPlaying}
            onParamsChange={handleParamsChange}
            onTogglePlay={handleTogglePlay}
            onReset={handleReset}
          />
        }
      />
    </SimulationPage>
  );
}
