/**
 * Read-only diagnosis of Ilona unmarked-past assistant items.
 * Run: npx tsx scripts/diagnose-ilona-pause.ts
 */
import { buildUnmarkedPastItems } from '../src/lib/assistant-marking';
import { getMoscowDateKey } from '../src/lib/lesson-datetime';
import { isStudentPaused } from '../src/lib/student-utils';
import {
  bootstrapIntegrationProcessEnv,
  createIntegrationSupabaseClient,
  resolveIntegrationSupabaseConfig,
} from './lib/supabase-integration-env';

async function main() {
  bootstrapIntegrationProcessEnv();
  const config = resolveIntegrationSupabaseConfig(process.env);
  if (!config) throw new Error('Missing Supabase integration config');

  const { fetchStudentsFromSupabase } = await import(
    '../src/lib/supabase/students/repository'
  );
  const { fetchLessonsFromSupabase } = await import(
    '../src/lib/supabase/lessons/repository'
  );
  const { fetchScheduleSlotsFromSupabase } = await import(
    '../src/lib/supabase/schedule-slots/repository'
  );

  const client = createIntegrationSupabaseClient(config);
  const [studentsResult, lessonsResult, slotsResult] = await Promise.all([
    fetchStudentsFromSupabase(),
    fetchLessonsFromSupabase(),
    fetchScheduleSlotsFromSupabase(),
  ]);

  if (!studentsResult.ok) throw new Error(studentsResult.error);
  if (!lessonsResult.ok) throw new Error(lessonsResult.error);
  if (!slotsResult.ok) throw new Error(slotsResult.error);

  const ilona = studentsResult.data.filter((s) =>
    s.name.toLowerCase().includes('илон'),
  );
  console.log(
    'students matching Илон*:',
    ilona.map((s) => ({
      id: s.id,
      name: s.name,
      activityStatus: s.activityStatus,
      pauseComment: s.pauseComment,
      startedAt: s.startedAt,
      createdAt: s.createdAt,
    })),
  );

  for (const student of ilona) {
    const { data: row } = await client
      .from('students')
      .select(
        'app_id, name, activity_status, pause_comment, started_at, created_at, updated_at',
      )
      .eq('app_id', student.id)
      .maybeSingle();
    console.log('DB row:', row);

    const studentLessons = lessonsResult.data
      .filter((l) => l.studentId === student.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    console.log(
      `lessons (${studentLessons.length}):`,
      studentLessons.map((l) => ({
        id: l.id,
        date: l.date,
        status: l.status,
        attendance: l.attendance,
        isOutsideSchedule: l.isOutsideSchedule,
        lessonType: l.lessonType,
      })),
    );

    const studentSlots = slotsResult.data.filter((slot) =>
      slot.studentIds.includes(student.id),
    );
    console.log(
      `slots (${studentSlots.length}):`,
      studentSlots.map((slot) => ({
        id: slot.id,
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
        joinedAt: slot.studentJoinedAt?.[student.id],
        patternHistory: slot.patternHistory?.length ?? 0,
      })),
    );

    const pausedIds = new Set(
      studentsResult.data.filter(isStudentPaused).map((s) => s.id),
    );
    const today = getMoscowDateKey();
    const unmarked = buildUnmarkedPastItems(
      slotsResult.data,
      lessonsResult.data,
      studentsResult.data,
      pausedIds,
      today,
    ).filter((item) => item.studentId === student.id);

    console.log(`today=${today}, unmarked for ${student.name}: ${unmarked.length}`);
    for (const item of unmarked) {
      console.log({
        id: item.id,
        dateKey: item.dateKey,
        weekdayLabel: item.weekdayLabel,
        timeLabel: item.timeLabel,
        source: item.source,
        lessonId: item.lessonId,
      });
    }

    // Dry-run with historical pause ending on resume day 2026-11-06.
    const studentsWithSeededPause = studentsResult.data.map((item) =>
      item.id === student.id
        ? {
            ...item,
            pauseIntervals: [{ from: '2026-10-10', to: '2026-11-06' }],
          }
        : item,
    );
    const afterSeed = buildUnmarkedPastItems(
      slotsResult.data,
      lessonsResult.data,
      studentsWithSeededPause,
      pausedIds,
      today,
    ).filter((item) => item.studentId === student.id);
    console.log(
      `after seeded pause interval: ${afterSeed.length} unmarked → ${afterSeed
        .map((item) => item.dateKey)
        .join(', ')}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
