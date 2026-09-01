'use client';

import { SUMMER_SCHOOL_PLACES } from '@/lib/tools/summer-school-results';
import { SummerSchoolFinal } from '@/components/tools/summer-school/SummerSchoolFinal';
import { SummerSchoolFirstPlace } from '@/components/tools/summer-school/SummerSchoolFirstPlace';
import { SummerSchoolHero } from '@/components/tools/summer-school/SummerSchoolHero';
import { SummerSchoolIpad } from '@/components/tools/summer-school/SummerSchoolIpad';
import { SummerSchoolPlace } from '@/components/tools/summer-school/SummerSchoolPlace';
import { SummerSchoolResultsSettings } from '@/components/tools/summer-school/SummerSchoolResultsSettings';
import {
  SummerSchoolStory,
  SummerSchoolTransition,
} from '@/components/tools/summer-school/SummerSchoolStory';
import { useSummerSchoolResultsState } from '@/components/tools/summer-school/useSummerSchoolResultsState';

export function SummerSchoolResults() {
  const {
    state,
    isHydrated,
    saveNames,
    updatePlaceName,
    revealPlace,
    setSettingsHidden,
  } = useSummerSchoolResultsState();

  if (!isHydrated) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 px-6 py-16 text-center text-zinc-500">
        Загрузка итогов…
      </div>
    );
  }

  return (
    <div className="relative overflow-x-hidden">
      <SummerSchoolResultsSettings
        state={state}
        onSave={saveNames}
        onReveal={revealPlace}
        onHide={() => setSettingsHidden(true)}
        onShow={() => setSettingsHidden(false)}
      />

      <div className="space-y-16 sm:space-y-24 lg:space-y-28">
        <SummerSchoolHero />
        <SummerSchoolStory />
        <SummerSchoolTransition />
        <SummerSchoolPlace
          place={SUMMER_SCHOOL_PLACES.third}
          name={state.thirdPlaceName}
          nameRevealed={state.thirdPlaceRevealed}
          settingsHidden={state.settingsHidden}
          onReveal={() => revealPlace('third')}
          onRename={(name) => updatePlaceName('third', name)}
        />
        <SummerSchoolPlace
          place={SUMMER_SCHOOL_PLACES.second}
          name={state.secondPlaceName}
          nameRevealed={state.secondPlaceRevealed}
          settingsHidden={state.settingsHidden}
          onReveal={() => revealPlace('second')}
          onRename={(name) => updatePlaceName('second', name)}
        />
        <SummerSchoolFirstPlace
          name={state.firstPlaceName}
          nameRevealed={state.firstPlaceRevealed}
          settingsHidden={state.settingsHidden}
          onReveal={() => revealPlace('first')}
          onRename={(name) => updatePlaceName('first', name)}
        />
        <SummerSchoolIpad />
        <SummerSchoolFinal />
      </div>
    </div>
  );
}
