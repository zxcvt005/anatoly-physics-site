'use client';

import { SUMMER_SCHOOL_PLACES } from '@/lib/tools/summer-school-results';
import { SummerSchoolPrizeImage } from '@/components/tools/summer-school/SummerSchoolPrizeImage';
import { SummerSchoolWinnerReveal } from '@/components/tools/summer-school/SummerSchoolWinnerReveal';
import { useWinnerAnnouncement } from '@/components/tools/summer-school/useWinnerAnnouncement';

type SummerSchoolFirstPlaceProps = {
  name: string;
  nameRevealed: boolean;
  settingsHidden: boolean;
  onReveal: () => void;
  onRename: (name: string) => void;
};

const place = SUMMER_SCHOOL_PLACES.first;

export function SummerSchoolFirstPlace({
  name,
  nameRevealed,
  settingsHidden,
  onReveal,
  onRename,
}: SummerSchoolFirstPlaceProps) {
  const announcement = useWinnerAnnouncement(nameRevealed);

  return (
    <section
      ref={announcement.ref}
      className="relative overflow-hidden rounded-[2rem] border border-[#3166F0]/25 bg-zinc-950/80 px-5 py-16 sm:px-10 sm:py-24 lg:px-14 lg:py-28 min-h-[min(92vh,64rem)]"
      aria-label={place.title}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-96 w-96 rounded-full bg-[#3166F0]/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-[#3166F0]/12 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl text-center">
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
          <div className="mt-12 sm:mt-16 animate-[ss-fade-up_0.9s_cubic-bezier(0.22,1,0.36,1)_both]">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#3166F0]">
              {place.prizeLabel}
            </p>
            <p className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
              {place.prizeName}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[0.12em] text-zinc-200 sm:text-4xl">
              {place.prizeSubtitle}
            </p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-xl">
              {place.prizeDescription}
            </p>

            <SummerSchoolPrizeImage
              src={place.imageSrc}
              alt={place.imageAlt}
              label="Сертификат на обучение"
              className="mt-10 aspect-[16/10] w-full shadow-[0_0_60px_rgba(49,102,240,0.18)]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 720px"
            />
          </div>
        )}
      </div>
    </section>
  );
}
