'use client';

import { SimulationButton } from '@/components/tools/simulations/SimulationButton';
import { SimulationControlSection } from '@/components/tools/simulations/SimulationControlSection';
import { SimulationControls } from '@/components/tools/simulations/SimulationControls';
import { SimulationFormulaBlock } from '@/components/tools/simulations/SimulationFormulaBlock';
import { SimulationSlider } from '@/components/tools/simulations/SimulationSlider';
import { SimulationStats } from '@/components/tools/simulations/SimulationStats';
import { getKinematicsFormulaLines } from '@/lib/tools/simulations/kinematics/formulas';
import { KINEMATICS_RANGES } from '@/lib/tools/simulations/kinematics/constants';
import {
  formatAcceleration,
  formatMeters,
  formatMetersPerSecond,
  formatSeconds,
} from '@/lib/tools/simulations/kinematics/physics';
import type {
  KinematicsLiveState,
  KinematicsParams,
} from '@/lib/tools/simulations/kinematics/types';

type KinematicsEquationControlsProps = {
  params: KinematicsParams;
  live: KinematicsLiveState;
  isPlaying: boolean;
  onParamsChange: (params: KinematicsParams) => void;
  onTogglePlay: () => void;
  onReset: () => void;
};

export function KinematicsEquationControls({
  params,
  live,
  isPlaying,
  onParamsChange,
  onTogglePlay,
  onReset,
}: KinematicsEquationControlsProps) {
  const formulas = getKinematicsFormulaLines(params);

  const patch = (partial: Partial<KinematicsParams>) => {
    onParamsChange({ ...params, ...partial });
  };

  return (
    <SimulationControls compact fitHeight>
      <SimulationControlSection title="Параметры">
        <SimulationSlider
          label="Начальная координата x₀"
          value={params.x0}
          min={KINEMATICS_RANGES.x0.min}
          max={KINEMATICS_RANGES.x0.max}
          step={KINEMATICS_RANGES.x0.step}
          displayValue={`x₀ = ${formatMeters(params.x0)}`}
          onChange={(x0) => patch({ x0 })}
        />
        <SimulationSlider
          label="Начальная скорость v₀"
          value={params.v0}
          min={KINEMATICS_RANGES.v0.min}
          max={KINEMATICS_RANGES.v0.max}
          step={KINEMATICS_RANGES.v0.step}
          displayValue={`v₀ = ${formatMetersPerSecond(params.v0)}`}
          onChange={(v0) => patch({ v0 })}
        />
        <SimulationSlider
          label="Ускорение a"
          value={params.a}
          min={KINEMATICS_RANGES.a.min}
          max={KINEMATICS_RANGES.a.max}
          step={KINEMATICS_RANGES.a.step}
          displayValue={`a = ${formatAcceleration(params.a)}`}
          onChange={(a) => patch({ a })}
        />
        <SimulationSlider
          label="Время исследования t"
          value={params.duration}
          min={KINEMATICS_RANGES.duration.min}
          max={KINEMATICS_RANGES.duration.max}
          step={KINEMATICS_RANGES.duration.step}
          displayValue={`T = ${formatSeconds(params.duration)}`}
          onChange={(duration) => patch({ duration })}
        />
      </SimulationControlSection>

      <SimulationControlSection title="Состояние">
        <SimulationStats
          items={[
            { label: 't', value: formatSeconds(live.time) },
            { label: 'x', value: formatMeters(live.x) },
            { label: 'v', value: formatMetersPerSecond(live.v) },
            { label: 'a', value: formatAcceleration(params.a) },
          ]}
        />
      </SimulationControlSection>

      <div className="grid grid-cols-2 gap-2">
        <SimulationButton variant="primary" onClick={onTogglePlay}>
          {isPlaying ? 'Пауза' : 'Пуск'}
        </SimulationButton>
        <SimulationButton onClick={onReset}>Сброс</SimulationButton>
      </div>

      <SimulationFormulaBlock lines={formulas} />
    </SimulationControls>
  );
}
