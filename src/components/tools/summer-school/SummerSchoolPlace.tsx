'use client';

import type { SummerSchoolPlaceContent } from '@/lib/tools/summer-school-results';
import { SummerSchoolPrizeImage } from '@/components/tools/summer-school/SummerSchoolPrizeImage';
import { SummerSchoolWinnerReveal } from '@/components/tools/summer-school/SummerSchoolWinnerReveal';
import { useWinnerAnnouncement } from '@/components/tools/summer-school/useWinnerAnnouncement';

type SummerSchoolPlaceProps = {
  place: SummerSchoolPlaceContent;
  name: string;
  nameRevealed: boolean;
  settingsHidden: boolean;
  onReveal: () => void;
  onRename: (name: string) => void;
};

const glowByScale = {
  moderate: 'bg-[#3166F0]/10',
  expressive: 'bg-[#3166F0]/16',
  grand: 'bg-[#3166F0]/22',
} as const;

const sectionPad = {
  moderate: 'min-h-[min(78vh,46rem)] px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20',
  expressive:
    'min-h-[min(84vh,52rem)] px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24',
  grand: 'min-h-[min(92vh,60rem)] px-5 py-16 sm:px-10 sm:py-24 lg:px-14 lg:py-28',
} as const;

export function SummerSchoolPlace({
  place,
  name,
  nameRevealed,
  settingsHidden,
  onReveal,
  onRename,
}: SummerSchoolPlaceProps) {
  const announcement = useWinnerAnnouncement(nameRevealed);

  return (
    <section
      ref={announcement.ref}
      className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/70 ${sectionPad[place.scale]}`}
      aria-label={place.title}
    >
      <div
        className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl ${glowByScale[place.scale]}`}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-[#3166F0]/8 blur-3xl"
        aria-hidden
      />

      <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
        <SummerSchoolWinnerReveal
          rank={place.rank}
          title={place.title}
          name={name}
          nameRevealed={nameRevealed}
          showNumber={announcement.showNumber}
          showTitle={announcement.showTitle}
          showIdentity={announcement.showIdentity}
          showName={announcement.showName}
          scale={place.scale}
          showCongratulations={place.showCongratulations}
          settingsHidden={settingsHidden}
          onReveal={onReveal}
          onRename={onRename}
        />

        {announcement.showPrize && (
          <div className="animate-[ss-fade-up_0.85s_cubic-bezier(0.22,1,0.36,1)_both]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-[#3166F0]">
              {place.prizeLabel}
            </p>
            <h3 className="text-2xl font-bold text-white sm:text-3xl">
              {place.prizeName}
            </h3>
            {place.prizeSubtitle && (
              <p className="mt-1 text-xl font-semibold text-[#3166F0] sm:text-2xl">
                {place.prizeSubtitle}
              </p>
            )}
            <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-400 sm:text-lg">
              {place.prizeDescription}
            </p>
            <SummerSchoolPrizeImage
              src={place.imageSrc}
              alt={place.imageAlt}
              label={place.prizeName}
              className="mt-8 aspect-[4/3] w-full"
            />
          </div>
        )}
      </div>
    </section>
  );
}
