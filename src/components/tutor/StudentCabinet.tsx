'use client';

import { useMemo } from 'react';
import { AddPaymentForm } from '@/components/tutor/AddPaymentForm';
import { StudentInstructions } from '@/components/tutor/StudentInstructions';
import { StudentLessonCalendar } from '@/components/tutor/StudentLessonCalendar';
import { StudentProgressSection } from '@/components/tutor/StudentProgressSection';
import { buildStudentLessonView } from '@/lib/schedule-lessons';
import {
  formatLessonStartTime,
  formatLessonTimeRange,
} from '@/lib/lesson-datetime';
import { formatTransferTargetLabel } from '@/lib/lesson-transfer';
import { isStudentPaused } from '@/lib/student-utils';
import { getScheduleForStudentFromSlots } from '@/lib/schedule-utils';
import {
  buildStudentPaymentContext,
  formatAttendance,
  formatDateShort,
  formatDateTime,
  formatDateWithoutYear,
  formatHomeworkStatus,
  formatMoney,
  formatTime,
  getConfirmedPaymentPresets,
  getFutureLessonPaymentStatus,
  getNextLesson,
} from '@/lib/tutor-calculations';
import type {
  FutureLessonPaymentStatus,
  LessonQueueCoverage,
} from '@/lib/tutor-calculations';
import {
  getLessonsForStudentFromList,
  useLessons,
} from '@/providers/LessonsProvider';
import {
  getPaymentsForStudentFromList,
  usePayments,
} from '@/providers/PaymentsProvider';
import { useScheduleSlots } from '@/providers/ScheduleSlotsProvider';
import type { Lesson, Payment, Student } from '@/types/tutor';

interface StudentCabinetProps {
  student: Student;
}

/** Только для списка «Будущие занятия»; не влияет на оплаты и календарь. */
const UPCOMING_LIST_HORIZON_DAYS = 14;

function filterLessonsForUpcomingList(lessons: Lesson[]): Lesson[] {
  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0);

  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + UPCOMING_LIST_HORIZON_DAYS);
  windowEnd.setHours(23, 59, 59, 999);

  return lessons.filter((lesson) => {
    const lessonDate = new Date(lesson.date);
    return lessonDate >= windowStart && lessonDate <= windowEnd;
  });
}

export function StudentCabinet({ student }: StudentCabinetProps) {
  const { lessons } = useLessons();
  const { slots } = useScheduleSlots();
  const { payments: allPayments } = usePayments();
  const isPaused = isStudentPaused(student);

  const lessonView = useMemo(
    () => buildStudentLessonView(student.id, lessons, slots, 16, isPaused),
    [student.id, lessons, slots, isPaused],
  );

  const studentLessonsRaw = useMemo(
    () => getLessonsForStudentFromList(lessons, student.id),
    [lessons, student.id],
  );

  const studentPayments = useMemo(
    () => getPaymentsForStudentFromList(allPayments, student.id),
    [allPayments, student.id],
  );

  const studentSchedule = useMemo(
    () => getScheduleForStudentFromSlots(slots, student.id),
    [slots, student.id],
  );

  const paymentContext = useMemo(
    () =>
      buildStudentPaymentContext(
        student,
        lessonView.paymentLessons,
        studentPayments,
      ),
    [student, lessonView.paymentLessons, studentPayments],
  );

  const paidUntilDate = paymentContext.paidUntilDate;
  const nextLesson = getNextLesson(lessonView.upcomingLessons);
  const upcomingLessonsForList = useMemo(
    () => filterLessonsForUpcomingList(lessonView.upcomingLessons),
    [lessonView.upcomingLessons],
  );
  const pastLessons = lessonView.pastLessons;

  const calendar = (
    <StudentLessonCalendar
      lessons={lessonView.calendarLessons}
      scheduleSlots={isPaused ? [] : studentSchedule}
      coverageByLessonId={paymentContext.coverageByLessonId}
      isPaused={isPaused}
      compact
      className="min-w-0"
    />
  );

  const progress = (
    <StudentProgressSection
      studentId={student.id}
      lessons={studentLessonsRaw}
    />
  );

  const paymentPresets = getConfirmedPaymentPresets(studentPayments);

  const payments = (
    <StudentPaymentsPanel
      student={student}
      payments={studentPayments}
      amountPresets={paymentPresets}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="hidden xl:grid xl:grid-cols-2 xl:items-start xl:gap-6">
        <div className="grid min-w-0 grid-cols-[minmax(168px,200px)_1fr] items-start gap-4">
          <SummaryCardsColumn
            nextLesson={nextLesson}
            paidUntilDate={paidUntilDate}
            isPaused={isPaused}
            layout="desktop"
          />
          <div className="flex min-w-0 flex-col gap-3">
            {calendar}
            <div className="hidden xl:block">{progress}</div>
          </div>
        </div>
        <aside className="min-w-0">{payments}</aside>
      </section>

      <div className="flex flex-col gap-6 xl:hidden">
        <SummaryCardsColumn
          nextLesson={nextLesson}
          paidUntilDate={paidUntilDate}
          isPaused={isPaused}
          layout="mobile"
        />
        {payments}
        <StudentInstructions />
        {calendar}
        {progress}
        <UpcomingLessonsSection
          lessons={upcomingLessonsForList}
          allLessons={lessonView.allLessons}
          coverageByLessonId={paymentContext.coverageByLessonId}
          isPaused={isPaused}
          pauseComment={student.pauseComment}
        />
        <LessonHistorySection
          lessons={pastLessons}
          allLessons={lessonView.allLessons}
        />
      </div>

      <div className="hidden flex-col gap-6 xl:flex">
        <StudentInstructions />
        <UpcomingLessonsSection
          lessons={upcomingLessonsForList}
          allLessons={lessonView.allLessons}
          coverageByLessonId={paymentContext.coverageByLessonId}
          isPaused={isPaused}
          pauseComment={student.pauseComment}
        />
        <LessonHistorySection
          lessons={pastLessons}
          allLessons={lessonView.allLessons}
        />
      </div>
    </div>
  );
}

function SummaryCardsColumn({
  nextLesson,
  paidUntilDate,
  isPaused,
  layout = 'mobile',
}: {
  nextLesson: ReturnType<typeof getNextLesson>;
  paidUntilDate: string | null;
  isPaused?: boolean;
  layout?: 'mobile' | 'desktop';
}) {
  const wrapperClass =
    layout === 'desktop'
      ? 'flex flex-col gap-3 self-start'
      : 'grid gap-3 sm:grid-cols-2';

  return (
    <div className={wrapperClass}>
      <SummaryCard
        label="Следующее занятие"
        value={
          isPaused
            ? 'Пауза'
            : nextLesson
              ? formatDateWithoutYear(nextLesson.date)
              : 'Не запланировано'
        }
        detail={
          !isPaused && nextLesson
            ? formatLessonStartTime(nextLesson.date)
            : undefined
        }
        hint={!isPaused ? nextLesson?.topic : undefined}
        accent={!isPaused && Boolean(nextLesson)}
      />
      <SummaryCard
        label="Оплачено включительно до"
        value={paidUntilDate ? formatDateWithoutYear(paidUntilDate) : '—'}
        accent={Boolean(paidUntilDate)}
      />
    </div>
  );
}

function UpcomingLessonsSection({
  lessons,
  allLessons,
  coverageByLessonId,
  isPaused,
  pauseComment,
}: {
  lessons: Lesson[];
  allLessons: Lesson[];
  coverageByLessonId: Map<string, LessonQueueCoverage>;
  isPaused?: boolean;
  pauseComment?: string;
}) {
  return (
    <section>
      <SectionTitle>Будущие занятия</SectionTitle>
      {isPaused ? (
        <PauseBanner pauseComment={pauseComment} />
      ) : lessons.length === 0 ? (
        <EmptyState text="В ближайшие 2 недели занятий нет." />
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <FutureLessonCard
              key={lesson.id}
              lesson={lesson}
              allLessons={allLessons}
              coverage={coverageByLessonId.get(lesson.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LessonHistorySection({
  lessons,
  allLessons,
}: {
  lessons: Lesson[];
  allLessons: Lesson[];
}) {
  return (
    <section>
      <SectionTitle>История занятий</SectionTitle>
      {lessons.length === 0 ? (
        <EmptyState text="Пока нет прошедших занятий" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {lessons.map((lesson) => (
            <PastLessonCard
              key={lesson.id}
              lesson={lesson}
              allLessons={allLessons}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function StudentPaymentsPanel({
  student,
  payments,
  amountPresets,
}: {
  student: Student;
  payments: Payment[];
  amountPresets: number[];
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
      <AddPaymentForm
        studentId={student.id}
        studentName={student.name}
        amountPresets={amountPresets}
      />

      <p className="mt-3 text-sm leading-relaxed text-zinc-500">
        После проверки преподавателем оплата автоматически появится в системе.
      </p>

      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-white">
          История оплат
        </h2>

        {payments.length === 0 ? (
          <EmptyState text="Оплат пока нет" />
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  hint,
  accent,
}: {
  label: string;
  value: string;
  detail?: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 xl:text-[13px]">
        {label}
      </p>
      <p
        className={`mt-1 text-base font-semibold leading-tight xl:text-[17px] ${
          accent ? 'text-white' : 'text-zinc-400'
        }`}
      >
        {value}
        {detail && (
          <span className="ml-1.5 font-medium text-[#6B93FF]">{detail}</span>
        )}
      </p>
      {hint && (
        <p className="mt-1 line-clamp-1 text-xs text-zinc-500 xl:text-sm">
          {hint}
        </p>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-lg font-semibold text-white md:text-xl">
      {children}
    </h2>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
      {text}
    </p>
  );
}

function PauseBanner({ pauseComment }: { pauseComment?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900/60 px-5 py-4">
      <p className="text-sm font-semibold text-zinc-200">Пауза в занятиях</p>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
        Расписание временно не отображается. После возобновления занятий оно
        появится здесь.
      </p>
      {pauseComment && (
        <p className="mt-2 text-sm text-zinc-400">
          Комментарий: {pauseComment}
        </p>
      )}
    </div>
  );
}

const futureStatusConfig: Record<
  FutureLessonPaymentStatus,
  { label: string; badgeClass: string; cardClass: string }
> = {
  covered: {
    label: 'Покрыто оплатой',
    badgeClass: 'bg-[#3166F0]/15 text-[#6B93FF] border-[#3166F0]/30',
    cardClass: 'border-zinc-800 bg-zinc-900/60',
  },
  pending: {
    label: 'Ожидает подтверждения оплаты',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    cardClass: 'border-zinc-800 bg-zinc-950',
  },
  required: {
    label: 'Требуется оплата',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    cardClass: 'border-red-500/20 bg-zinc-950',
  },
};

function FutureLessonCard({
  lesson,
  allLessons,
  coverage,
}: {
  lesson: Lesson;
  allLessons: Lesson[];
  coverage?: LessonQueueCoverage;
}) {
  const status = getFutureLessonPaymentStatus(lesson, coverage);
  const config = futureStatusConfig[status];
  const makeupSource = lesson.makeupForLessonId
    ? allLessons.find((l) => l.id === lesson.makeupForLessonId)
    : null;
  const transferSource = lesson.transferredFromLessonId
    ? allLessons.find((l) => l.id === lesson.transferredFromLessonId)
    : null;

  return (
    <div className={`rounded-2xl border px-5 py-4 ${config.cardClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-white">
              {formatDateWithoutYear(lesson.date)}
              <span className="ml-2 text-sm font-medium text-[#6B93FF]">
                {formatLessonTimeRange(lesson)}
              </span>
            </p>
            {(lesson.isOutsideSchedule || lesson.lessonType === 'transfer') && (
              <OutsideLessonBadge
                lesson={lesson}
                makeupSource={makeupSource}
                transferSource={transferSource}
              />
            )}
          </div>
          {lesson.topic && (
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400 xl:text-base">
              {lesson.topic}
            </p>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium xl:text-sm ${config.badgeClass}`}
        >
          {config.label}
        </span>
      </div>
    </div>
  );
}

function PastLessonCard({
  lesson,
  allLessons,
}: {
  lesson: Lesson;
  allLessons: Lesson[];
}) {
  const homeworkScore =
    lesson.homeworkScore !== undefined ? `${lesson.homeworkScore}/10` : '—';
  const homeworkStatus = formatHomeworkStatus(lesson.homeworkStatus);
  const isHomeworkNotDone = lesson.homeworkStatus === 'not_done';
  const makeupSource = lesson.makeupForLessonId
    ? allLessons.find((l) => l.id === lesson.makeupForLessonId)
    : null;
  const transferTarget = lesson.transferredToLessonId
    ? allLessons.find((l) => l.id === lesson.transferredToLessonId)
    : null;
  const transferLabel = formatTransferTargetLabel(transferTarget ?? undefined);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-white">
          {formatDateShort(lesson.date)}
        </p>
        {lesson.attendance === 'transferred' && (
          <span className="inline-flex shrink-0 items-center rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
            Перенесено
          </span>
        )}
        {lesson.lessonType === 'makeup' && (
          <MakeupHistoryBadge makeupSource={makeupSource} />
        )}
        {lesson.lessonType === 'extra' && (
          <span className="inline-flex shrink-0 items-center rounded-md border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-300">
            Дополнительное занятие
          </span>
        )}
        {lesson.lessonType === 'transfer' && (
          <span className="inline-flex shrink-0 items-center rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
            Перенос
          </span>
        )}
      </div>
      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-zinc-400 xl:text-sm">
        {lesson.topic ?? 'Тема не указана'}
      </p>
      {transferLabel && (
        <p className="mt-1 text-xs text-sky-300/90">
          Перенесено на {transferLabel}
        </p>
      )}
      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 xl:text-sm">
        <span>{formatAttendance(lesson.attendance)}</span>
        {lesson.attendance !== 'transferred' && (
          <>
        <span className="text-zinc-700">·</span>
        {isHomeworkNotDone ? (
          <span className="inline-flex items-center rounded-md border border-red-500/35 bg-red-500/10 px-1.5 py-0.5 text-red-400">
            ДЗ не сделано · {homeworkScore}
          </span>
        ) : (
          <span>
            ДЗ {homeworkScore} · {homeworkStatus}
          </span>
        )}
          </>
        )}
      </p>
    </div>
  );
}

function OutsideLessonBadge({
  lesson,
  makeupSource,
  transferSource,
}: {
  lesson: Lesson;
  makeupSource: Lesson | null | undefined;
  transferSource?: Lesson | null | undefined;
}) {
  if (lesson.lessonType === 'transfer') {
    return (
      <span className="inline-flex flex-col rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[10px] font-medium leading-tight text-sky-300">
        <span>Перенос</span>
        {transferSource && (
          <span className="font-normal text-sky-400/90">
            с {formatDateShort(transferSource.date)}
          </span>
        )}
      </span>
    );
  }

  if (lesson.lessonType === 'makeup') {
    return (
      <span className="inline-flex flex-col rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] font-medium leading-tight text-violet-300">
        <span>Отработка</span>
        {makeupSource && (
          <span className="font-normal text-violet-400/90">
            за {formatDateShort(makeupSource.date)}
          </span>
        )}
      </span>
    );
  }

  if (lesson.lessonType === 'extra') {
    return (
      <span className="inline-flex items-center rounded-md border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-300">
        Дополнительное занятие
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
      Занятие вне расписания
    </span>
  );
}

function MakeupHistoryBadge({
  makeupSource,
}: {
  makeupSource: Lesson | null | undefined;
}) {
  return (
    <span className="inline-flex flex-col items-end rounded-md border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-violet-300">
      <span>Отработано</span>
      {makeupSource && (
        <span className="font-normal text-violet-400/90">
          за {formatDateShort(makeupSource.date)}
        </span>
      )}
    </span>
  );
}

function PaymentCard({ payment }: { payment: Payment }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/40 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-white">
            {formatMoney(payment.amount)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {formatDateTime(payment.createdAt)}
          </p>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: Payment['status'] }) {
  const config = {
    confirmed: {
      label: 'Подтверждено',
      className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    pending: {
      label: 'Ожидает подтверждения',
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    rejected: {
      label: 'Отклонено',
      className: 'bg-red-500/15 text-red-400 border-red-500/30',
    },
  }[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-tight xl:text-sm ${config.className}`}
    >
      {config.label}
    </span>
  );
}
