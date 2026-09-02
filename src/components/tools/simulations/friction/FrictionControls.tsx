'use client';

import { SimulationButton } from '@/components/tools/simulations/SimulationButton';
import { SimulationControlSection } from '@/components/tools/simulations/SimulationControlSection';
import { SimulationControls } from '@/components/tools/simulations/SimulationControls';
import { SimulationFormulaBlock } from '@/components/tools/simulations/SimulationFormulaBlock';
import { SimulationSegmentedControl } from '@/components/tools/simulations/SimulationSegmentedControl';
import { SimulationSlider } from '@/components/tools/simulations/SimulationSlider';
import { SimulationStats } from '@/components/tools/simulations/SimulationStats';
import { SimulationToggle } from '@/components/tools/simulations/SimulationToggle';
import { FRICTION_RANGES } from '@/lib/tools/simulations/friction/constants';
import { getFrictionFormulaLines } from '@/lib/tools/simulations/friction/formulas';
import {
  formatAcceleration,
  formatAngle,
  formatMass,
  formatMetersPerSecond,
  formatMu,
  formatNewtons,
} from '@/lib/tools/simulations/friction/physics';
import type {
  FrictionParams,
  FrictionSnapshot,
  PlaneMode,
} from '@/lib/tools/simulations/friction/types';

type FrictionControlsProps = {
  params: FrictionParams;
  showForces: boolean;
  snapshot: FrictionSnapshot;
  onParamsChange: (params: FrictionParams) => void;
  onShowForcesChange: (value: boolean) => void;
  onReset: () => void;
};

export function FrictionControls({
  params,
  showForces,
  snapshot,
  onParamsChange,
  onShowForcesChange,
  onReset,
}: FrictionControlsProps) {
  const { forces, motion } = snapshot;
  const formulas = getFrictionFormulaLines(params, forces);

  const patch = (partial: Partial<FrictionParams>) => {
    onParamsChange({ ...params, ...partial });
  };

  return (
    <SimulationControls>
      <SimulationControlSection title="Плоскость">
        <SimulationSegmentedControl<PlaneMode>
          label="Режим"
          value={params.mode}
          onChange={(mode) => patch({ mode })}
          options={[
            { value: 'horizontal', label: 'Горизонтальная' },
            { value: 'inclined', label: 'Наклонная' },
          ]}
        />
      </SimulationControlSection>

      <SimulationControlSection title="Параметры">
        <SimulationSlider
          label="Масса"
          value={params.mass}
          min={FRICTION_RANGES.mass.min}
          max={FRICTION_RANGES.mass.max}
          step={FRICTION_RANGES.mass.step}
          displayValue={`m = ${formatMass(params.mass)}`}
          onChange={(mass) => patch({ mass })}
        />
        <SimulationSlider
          label="Коэффициент трения"
          value={params.mu}
          min={FRICTION_RANGES.mu.min}
          max={FRICTION_RANGES.mu.max}
          step={FRICTION_RANGES.mu.step}
          displayValue={`μ = ${formatMu(params.mu)}`}
          onChange={(mu) => patch({ mu })}
        />
        {params.mode === 'inclined' && (
          <SimulationSlider
            label="Угол наклона"
            value={params.angleDeg}
            min={FRICTION_RANGES.angleDeg.min}
            max={FRICTION_RANGES.angleDeg.max}
            step={FRICTION_RANGES.angleDeg.step}
            displayValue={`α = ${formatAngle(params.angleDeg)}`}
            onChange={(angleDeg) => patch({ angleDeg })}
          />
        )}
      </SimulationControlSection>

      <SimulationControlSection title="Сила">
        <SimulationSlider
          label="Сила тяги"
          value={params.appliedForce}
          min={FRICTION_RANGES.appliedForce.min}
          max={FRICTION_RANGES.appliedForce.max}
          step={FRICTION_RANGES.appliedForce.step}
          displayValue={`F = ${formatNewtons(params.appliedForce)}`}
          onChange={(appliedForce) => patch({ appliedForce })}
        />
      </SimulationControlSection>

      <SimulationControlSection title="Состояние">
        <div
          className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold ${
            forces.isResting
              ? 'border-zinc-800 bg-black/30 text-zinc-300'
              : 'border-[#3166F0]/25 bg-[#3166F0]/10 text-blue-100'
          }`}
        >
          <span
            className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${
              forces.isResting ? 'bg-zinc-400' : 'bg-[#3166F0]'
            }`}
            aria-hidden
          />
          {forces.isResting ? 'Тело покоится' : 'Тело движется'}
        </div>
        <SimulationStats
          items={[
            { label: 'Сила трения', value: formatNewtons(Math.abs(forces.friction)) },
            { label: 'Fтр,max', value: formatNewtons(forces.maxStaticFriction) },
            { label: 'Нормальная реакция', value: formatNewtons(forces.normal) },
            { label: 'Ускорение', value: formatAcceleration(forces.acceleration) },
            { label: 'Скорость', value: formatMetersPerSecond(motion.velocity) },
          ]}
        />
      </SimulationControlSection>

      <SimulationControlSection title="Отображение">
        <SimulationToggle
          label="Показывать силы"
          checked={showForces}
          onChange={onShowForcesChange}
        />
      </SimulationControlSection>

      <SimulationFormulaBlock lines={formulas} />

      <SimulationButton onClick={onReset}>Сбросить</SimulationButton>
    </SimulationControls>
  );
}
