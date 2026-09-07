'use client';

import { SimulationButton } from '@/components/tools/simulations/SimulationButton';
import { SimulationControlSection } from '@/components/tools/simulations/SimulationControlSection';
import { SimulationControls } from '@/components/tools/simulations/SimulationControls';
import { SimulationFormulaBlock } from '@/components/tools/simulations/SimulationFormulaBlock';
import { SimulationSlider } from '@/components/tools/simulations/SimulationSlider';
import { SimulationStats } from '@/components/tools/simulations/SimulationStats';
import {
  CONTROL_MODE_OPTIONS,
  HUMIDITY_RANGES,
} from '@/lib/tools/simulations/humidity/constants';
import { getHumidityFormulas } from '@/lib/tools/simulations/humidity/formulas';
import {
  formatHumidityNumber,
  patchParams,
  phaseLabel,
} from '@/lib/tools/simulations/humidity/physics';
import type {
  HumidityControlMode,
  HumidityParams,
  HumiditySnapshot,
} from '@/lib/tools/simulations/humidity/types';

type HumidityControlsProps = {
  params: HumidityParams;
  snapshot: HumiditySnapshot;
  onParamsChange: (params: HumidityParams) => void;
  onReset: () => void;
};

export function HumidityControls({
  params,
  snapshot,
  onParamsChange,
  onReset,
}: HumidityControlsProps) {
  const patch = (partial: Partial<HumidityParams>) => {
    onParamsChange(patchParams(params, partial));
  };

  const activeControl = (() => {
    switch (params.controlMode) {
      case 'pressure':
        return {
          label: 'Давление P',
          value: params.pressureKPa,
          min: HUMIDITY_RANGES.pressureKPa.min,
          max: HUMIDITY_RANGES.pressureKPa.max,
          step: HUMIDITY_RANGES.pressureKPa.step,
          display: `P = ${formatHumidityNumber(params.pressureKPa, 3)} кПа`,
          onChange: (pressureKPa: number) => patch({ pressureKPa }),
        };
      case 'density':
        return {
          label: 'Плотность ρ',
          value: params.densityKgM3,
          min: HUMIDITY_RANGES.densityKgM3.min,
          max: HUMIDITY_RANGES.densityKgM3.max,
          step: HUMIDITY_RANGES.densityKgM3.step,
          display: `ρ = ${formatHumidityNumber(params.densityKgM3, 4)} кг/м³`,
          onChange: (densityKgM3: number) => patch({ densityKgM3 }),
        };
      case 'concentration':
        return {
          label: 'Концентрация n',
          value: params.concentrationPerM3,
          min: HUMIDITY_RANGES.concentrationPerM3.min,
          max: HUMIDITY_RANGES.concentrationPerM3.max,
          step: HUMIDITY_RANGES.concentrationPerM3.step,
          display: `n = ${formatHumidityNumber(params.concentrationPerM3, 2)} 1/м³`,
          onChange: (concentrationPerM3: number) => patch({ concentrationPerM3 }),
        };
      case 'mass':
      default:
        return {
          label: 'Масса m',
          value: params.massKg,
          min: HUMIDITY_RANGES.massKg.min,
          max: HUMIDITY_RANGES.massKg.max,
          step: HUMIDITY_RANGES.massKg.step,
          display: `m = ${formatHumidityNumber(params.massKg, 4)} кг`,
          onChange: (massKg: number) => patch({ massKg }),
        };
    }
  })();

  return (
    <SimulationControls compact fitHeight>
      <SimulationControlSection title="Температура">
        <SimulationSlider
          label="T"
          value={params.temperatureC}
          min={HUMIDITY_RANGES.temperatureC.min}
          max={HUMIDITY_RANGES.temperatureC.max}
          step={HUMIDITY_RANGES.temperatureC.step}
          displayValue={`T = ${formatHumidityNumber(params.temperatureC, 1)} °C`}
          onChange={(temperatureC) => patch({ temperatureC })}
        />
      </SimulationControlSection>

      <SimulationControlSection title="Независимый параметр">
        <div
          className="grid grid-cols-2 gap-1.5 rounded-2xl border border-zinc-800 bg-black/40 p-1"
          role="radiogroup"
          aria-label="Независимый параметр"
        >
          {CONTROL_MODE_OPTIONS.map((option) => {
            const active = params.controlMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() =>
                  patch({ controlMode: option.value as HumidityControlMode })
                }
                className={`rounded-xl px-2 py-2 text-xs font-semibold transition duration-200 sm:text-sm ${
                  active
                    ? 'bg-[#3166F0] text-white shadow-[0_8px_24px_rgba(49,102,240,0.28)]'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-2.5">
          <SimulationSlider
            label={activeControl.label}
            value={activeControl.value}
            min={activeControl.min}
            max={activeControl.max}
            step={activeControl.step}
            displayValue={activeControl.display}
            onChange={activeControl.onChange}
          />
        </div>
      </SimulationControlSection>

      <SimulationControlSection title="Состояние">
        <SimulationStats
          items={[
            {
              label: 'φ',
              value: `${Math.round(snapshot.relativeHumidityPercent)}%`,
            },
            {
              label: 'P',
              value: `${formatHumidityNumber(snapshot.vaporPressureKPa, 3)} кПа`,
            },
            {
              label: 'ρ пара',
              value: `${formatHumidityNumber(snapshot.vaporDensityKgM3, 4)} кг/м³`,
            },
            {
              label: 'Pнас',
              value: `${formatHumidityNumber(snapshot.pSatKPa, 3)} кПа`,
            },
            {
              label: 'm пара',
              value: `${formatHumidityNumber(snapshot.vaporMassKg, 4)} кг`,
            },
            {
              label: 'm воды',
              value: `${formatHumidityNumber(snapshot.liquidMassKg, 4)} кг`,
            },
          ]}
        />
        <p className="mt-2 rounded-xl border border-[#3166F0]/20 bg-[#3166F0]/10 px-3 py-2 text-center text-sm font-semibold text-blue-100">
          {phaseLabel(snapshot.phase)}
          {snapshot.process === 'condense'
            ? ' · конденсация'
            : snapshot.process === 'evaporate'
              ? ' · испарение'
              : ''}
        </p>
      </SimulationControlSection>

      <SimulationFormulaBlock lines={getHumidityFormulas()} />

      <SimulationButton onClick={onReset}>Сброс</SimulationButton>
    </SimulationControls>
  );
}
