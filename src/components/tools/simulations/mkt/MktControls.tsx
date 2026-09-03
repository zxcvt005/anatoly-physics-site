'use client';

import { SimulationButton } from '@/components/tools/simulations/SimulationButton';
import { SimulationControlSection } from '@/components/tools/simulations/SimulationControlSection';
import { SimulationControls } from '@/components/tools/simulations/SimulationControls';
import { SimulationFormulaBlock } from '@/components/tools/simulations/SimulationFormulaBlock';
import { SimulationSegmentedControl } from '@/components/tools/simulations/SimulationSegmentedControl';
import { SimulationSlider } from '@/components/tools/simulations/SimulationSlider';
import { SimulationStats } from '@/components/tools/simulations/SimulationStats';
import { MktHeater } from '@/components/tools/simulations/mkt/MktHeater';
import { MKT_RANGES } from '@/lib/tools/simulations/mkt/constants';
import { getMktFormulaLines } from '@/lib/tools/simulations/mkt/formulas';
import {
  formatGasOptionLabel,
  getGasById,
  IDEAL_GASES,
} from '@/lib/tools/simulations/mkt/gases';
import {
  addGasComponent,
  canAddComponent,
  displayTemperature,
  formatMoles,
  formatPressure,
  formatSpeed,
  formatTemperatureC,
  formatTemperatureK,
  formatVolumeL,
  removeGasComponent,
  sanitizeTemperatureInput,
  totalMoles,
} from '@/lib/tools/simulations/mkt/physics';
import type {
  MktParams,
  MktSnapshot,
  TemperatureUnit,
} from '@/lib/tools/simulations/mkt/types';

type MktControlsProps = {
  params: MktParams;
  snapshot: MktSnapshot;
  onParamsChange: (params: MktParams) => void;
  onReset: () => void;
};

export function MktControls({
  params,
  snapshot,
  onParamsChange,
  onReset,
}: MktControlsProps) {
  const { macro, runtime } = snapshot;
  const formulas = getMktFormulaLines(params, macro);
  const unit = params.temperatureUnit;
  const displayT = displayTemperature(params.temperatureK, unit);
  const mixture = params.components.length > 1;

  const patch = (partial: Partial<MktParams>) => {
    onParamsChange({ ...params, ...partial });
  };

  return (
    <SimulationControls>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SimulationControlSection title="Газ">
          {params.components.map((component, index) => {
            const gas = getGasById(component.gasId);
            return (
              <div
                key={component.id}
                className="space-y-3 rounded-2xl border border-zinc-800 bg-black/30 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-200">
                    Газ {index + 1}
                  </p>
                  {params.components.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        patch({
                          components: removeGasComponent(
                            params.components,
                            component.id,
                          ),
                        })
                      }
                      className="min-h-11 rounded-xl px-2 text-xs font-semibold text-zinc-400 transition hover:text-white"
                    >
                      Удалить
                    </button>
                  )}
                </div>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm text-zinc-300">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: gas.color }}
                      aria-hidden
                    />
                    Вещество
                  </span>
                  <select
                    value={component.gasId}
                    onChange={(event) => {
                      patch({
                        components: params.components.map((item) =>
                          item.id === component.id
                            ? { ...item, gasId: event.target.value }
                            : item,
                        ),
                      });
                    }}
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none transition focus:border-[#3166F0]/60"
                    aria-label={`Газ ${index + 1}`}
                  >
                    {IDEAL_GASES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {formatGasOptionLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>
                <SimulationSlider
                  label="Количество вещества"
                  value={component.moles}
                  min={MKT_RANGES.moles.min}
                  max={MKT_RANGES.moles.max}
                  step={MKT_RANGES.moles.step}
                  displayValue={`ν = ${formatMoles(component.moles)}`}
                  onChange={(moles) => {
                    patch({
                      components: params.components.map((item) =>
                        item.id === component.id ? { ...item, moles } : item,
                      ),
                    });
                  }}
                />
              </div>
            );
          })}
          <SimulationButton
            variant="primary"
            disabled={!canAddComponent(params.components)}
            onClick={() =>
              patch({ components: addGasComponent(params.components) })
            }
          >
            + Добавить газ
          </SimulationButton>
        </SimulationControlSection>

        <div className="space-y-5">
          <SimulationControlSection title="Основные параметры">
            <SimulationSlider
              label="Объём сосуда"
              value={params.volumeL}
              min={MKT_RANGES.volumeL.min}
              max={MKT_RANGES.volumeL.max}
              step={MKT_RANGES.volumeL.step}
              displayValue={`V = ${formatVolumeL(params.volumeL)}`}
              onChange={(volumeL) => patch({ volumeL })}
            />
            <SimulationSegmentedControl<TemperatureUnit>
              label="Единицы температуры"
              value={unit}
              onChange={(temperatureUnit) => patch({ temperatureUnit })}
              options={[
                { value: 'K', label: 'K' },
                { value: 'C', label: '°C' },
              ]}
            />
            <SimulationSlider
              label="Установить температуру"
              value={displayT}
              min={
                unit === 'C'
                  ? MKT_RANGES.temperatureC.min
                  : MKT_RANGES.temperatureK.min
              }
              max={
                unit === 'C'
                  ? MKT_RANGES.temperatureC.max
                  : MKT_RANGES.temperatureK.max
              }
              step={unit === 'C' ? 0.01 : 1}
              displayValue={
                unit === 'C'
                  ? formatTemperatureC(params.temperatureK)
                  : formatTemperatureK(params.temperatureK)
              }
              onChange={(value) => {
                patch({
                  temperatureK: sanitizeTemperatureInput(value, unit),
                  heater: 0,
                });
              }}
            />
          </SimulationControlSection>

          <SimulationControlSection title="Нагрев / охлаждение">
            <MktHeater
              heater={params.heater}
              temperatureK={params.temperatureK}
              onHeaterChange={(heater) => patch({ heater })}
            />
          </SimulationControlSection>
        </div>
      </div>

      <SimulationControlSection title="Состояние">
        <SimulationStats
          items={[
            {
              label: mixture ? 'Давление смеси' : 'Давление',
              value: formatPressure(runtime.displayedPressurePa),
              note: mixture ? 'P = (Σνᵢ)RT / V' : 'P = νRT / V',
            },
            {
              label: 'Температура',
              value: formatTemperatureK(macro.temperatureK),
              note: 'T = t + 273.15',
            },
            {
              label: 'Объём',
              value: formatVolumeL(macro.volumeL),
            },
            {
              label: 'Средняя скорость',
              value: formatSpeed(runtime.meanSpeedMps),
              note: 'vср = √(8RT / πM)',
            },
            {
              label: 'Количество вещества',
              value: formatMoles(totalMoles(params.components)),
              note: mixture ? 'ν = Σνᵢ' : undefined,
            },
          ]}
        />
      </SimulationControlSection>

      <SimulationFormulaBlock lines={formulas} />

      <SimulationButton onClick={onReset}>Сбросить</SimulationButton>
    </SimulationControls>
  );
}
