import { SUMMER_SCHOOL_PLACES } from '@/lib/tools/summer-school-results';
import { SummerSchoolFinal } from '@/components/tools/summer-school/SummerSchoolFinal';
import { SummerSchoolFirstPlace } from '@/components/tools/summer-school/SummerSchoolFirstPlace';
import { SummerSchoolHero } from '@/components/tools/summer-school/SummerSchoolHero';
import { SummerSchoolIpad } from '@/components/tools/summer-school/SummerSchoolIpad';
import { SummerSchoolPlace } from '@/components/tools/summer-school/SummerSchoolPlace';
import {
  SummerSchoolStory,
  SummerSchoolTransition,
} from '@/components/tools/summer-school/SummerSchoolStory';

export function SummerSchoolResults() {
  return (
    <div className="relative overflow-x-hidden">
      <div className="space-y-16 sm:space-y-24 lg:space-y-28">
        <SummerSchoolHero />
        <SummerSchoolStory />
        <SummerSchoolTransition />
        <SummerSchoolPlace place={SUMMER_SCHOOL_PLACES.third} />
        <SummerSchoolPlace place={SUMMER_SCHOOL_PLACES.second} />
        <SummerSchoolFirstPlace />
        <SummerSchoolIpad />
        <SummerSchoolFinal />
      </div>
    </div>
  );
}
