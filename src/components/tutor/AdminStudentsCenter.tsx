'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Users, X } from 'lucide-react';
import { AdminAddPaymentModal } from '@/components/tutor/AdminAddPaymentModal';
import { AdminStudentFormModal } from '@/components/tutor/AdminStudentFormModal';
import { StudentCabinetLinkActions } from '@/components/tutor/StudentCabinetLinkActions';
import {
  computeStudentAdminStats,
  computeStudentAdminStatuses,
  formatAverageHomeworkShort,
  formatRemainingLessons,
  type StudentAdminStatus,
} from '@/lib/student-admin-stats';
import {
  filterStudentAdminRows,
  getScheduledStudentIds,
  STUDENT_ADMIN_FILTER_OPTIONS,
  type StudentAdminFilterId,
} from '@/lib/student-admin-filters';
import { isStudentPaused } from '@/lib/student-utils';
import { formatMoney } from '@/lib/tutor-calculations';
import { useLessons } from '@/providers/LessonsProvider';
import { usePayments } from '@/providers/PaymentsProvider';
import { useScheduleSlots } from '@/providers/ScheduleSlotsProvider';
import { useStudents } from '@/providers/StudentsProvider';
import type { Student } from '@/types/tutor';

export function AdminStudentsCenter() {
  const { students, addStudent, updateStudent, deleteStudent } = useStudents();
  const { lessons } = useLessons();
  const { payments, addPayment } = usePayments();
  const { slots } = useScheduleSlots();
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StudentAdminFilterId>('all');

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !formOpen && !paymentFormOpen) close();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, formOpen, paymentFormOpen, close]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const rows = useMemo(
    () =>
      students.map((student) => {
        const stats = computeStudentAdminStats(student, lessons, payments);
        return {
          student,
          stats,
          statuses: computeStudentAdminStatuses(
            student,
            stats,
            payments,
            slots,
          ),
        };
      }),
    [students, lessons, payments, slots],
  );

  const scheduledStudentIds = useMemo(
    () => getScheduledStudentIds(slots),
    [slots],
  );

  const filteredRows = useMemo(
    () =>
      filterStudentAdminRows(
        rows,
        searchQuery,
        activeFilter,
        scheduledStudentIds,
      ),
    [rows, searchQuery, activeFilter, scheduledStudentIds],
  );

  const openCreate = () => {
    setEditingStudent(null);
    setFormOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setFormOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#3166F0]/50 hover:text-white"
      >
        <Users className="h-4 w-4 text-[#6B93FF]" />
        <span>Ученики</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center p-3 sm:p-4 md:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
            aria-label="Закрыть учеников"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-students-title"
            className="relative z-10 flex h-full w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-4 sm:px-6">
              <div>
                <h2
                  id="admin-students-title"
                  className="text-xl font-semibold text-white"
                >
                  Ученики
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {filteredRows.length === students.length
                    ? `${students.length} в базе`
                    : `Показано ${filteredRows.length} из ${students.length}`}
                  {' · '}ставки и остатки пересчитываются автоматически
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentFormOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#3166F0]/40 bg-[#3166F0]/10 px-4 py-2 text-sm font-medium text-[#6B93FF] transition hover:border-[#3166F0]/60 hover:bg-[#3166F0]/20 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                  Добавить оплату
                </button>
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3166F0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2856d4]"
                >
                  <Plus className="h-4 w-4" />
                  Добавить ученика
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                  aria-label="Закрыть"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="shrink-0 space-y-3 border-b border-zinc-800 px-4 py-4 sm:px-6">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Поиск по имени, классу, контактам…"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {STUDENT_ADMIN_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setActiveFilter(option.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      activeFilter === option.id
                        ? 'bg-[#3166F0] text-white shadow-[0_0_16px_rgba(49,102,240,0.25)]'
                        : 'border border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
              {students.length === 0 ? (
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center">
                  <Users className="mb-3 h-8 w-8 text-zinc-600" />
                  <p className="text-sm text-zinc-500">Учеников пока нет</p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-4 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:text-white"
                  >
                    Добавить первого ученика
                  </button>
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center">
                  <p className="text-sm text-zinc-500">Ученики не найдены</p>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto rounded-2xl border border-zinc-800 lg:block">
                    <StudentsTable rows={filteredRows} onEdit={openEdit} />
                  </div>

                  <div className="space-y-3 lg:hidden">
                    {filteredRows.map(({ student, stats, statuses }) => (
                      <StudentMobileCard
                        key={student.id}
                        student={student}
                        stats={stats}
                        statuses={statuses}
                        onEdit={() => openEdit(student)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      <AdminStudentFormModal
        open={formOpen}
        student={editingStudent}
        onClose={() => {
          setFormOpen(false);
          setEditingStudent(null);
        }}
        onSubmit={(input) => {
          if (editingStudent) {
            updateStudent(editingStudent.id, input);
            return;
          }
          addStudent(input);
        }}
        onDelete={deleteStudent}
      />

      <AdminAddPaymentModal
        open={paymentFormOpen}
        students={students}
        onClose={() => setPaymentFormOpen(false)}
        onSubmit={addPayment}
      />
    </>
  );
}

function StudentsTable({
  rows,
  onEdit,
}: {
  rows: Array<{
    student: Student;
    stats: ReturnType<typeof computeStudentAdminStats>;
    statuses: StudentAdminStatus[];
  }>;
  onEdit: (student: Student) => void;
}) {
  return (
    <table className="w-full min-w-[1520px] text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
          <th className="px-3 py-3 font-medium">Имя</th>
          <th className="px-3 py-3 font-medium">Статус</th>
          <th className="px-3 py-3 font-medium">Класс</th>
          <th className="px-3 py-3 font-medium">Контакты родителей</th>
          <th className="px-3 py-3 font-medium">Ставка / 4 нед</th>
          <th className="px-3 py-3 font-medium">В неделю</th>
          <th className="px-3 py-3 font-medium">1 занятие</th>
          <th className="px-3 py-3 font-medium">Проведено</th>
          <th className="px-3 py-3 font-medium">Остаток</th>
          <th className="px-3 py-3 font-medium">Ср. ДЗ</th>
          <th className="px-3 py-3 font-medium">Студентка</th>
          <th className="px-3 py-3 font-medium">Действия</th>
          <th className="px-3 py-3 font-medium">Статусы</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ student, stats, statuses }) => (
          <tr
            key={student.id}
            className={`border-b border-zinc-800/80 last:border-0 hover:bg-zinc-900/40 ${
              isStudentPaused(student) ? 'opacity-60' : ''
            }`}
          >
            <td className="px-3 py-3 font-medium text-white">{student.name}</td>
            <td className="px-3 py-3">
              <StudentActivityBadge student={student} />
            </td>
            <td className="px-3 py-3 text-zinc-300">{student.gradeClass}</td>
            <td className="max-w-[160px] px-3 py-3 text-zinc-300">
              <ParentContactsCell value={student.parentContacts} />
            </td>
            <td className="px-3 py-3 text-zinc-300">
              {formatMoney(student.rate4Weeks)}
            </td>
            <td className="px-3 py-3 text-zinc-300">{student.lessonsPerWeek}</td>
            <td className="px-3 py-3 font-medium text-[#6B93FF]">
              {formatMoney(student.ratePerLesson)}
            </td>
            <td className="px-3 py-3 text-zinc-300">{stats.conductedLessons}</td>
            <td className="px-3 py-3">
              <RemainingBadge value={stats.remainingLessons} />
            </td>
            <td className="px-3 py-3 text-zinc-300">
              {formatAverageHomeworkShort(stats.averageHomeworkScore)}
            </td>
            <td className="px-3 py-3">
              <StudentCabinetLinkActions token={student.token} />
            </td>
            <td className="px-3 py-3">
              <button
                type="button"
                onClick={() => onEdit(student)}
                className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-[#3166F0]/50 hover:text-white"
              >
                Редактировать
              </button>
            </td>
            <td className="px-3 py-3 align-top">
              <StudentStatusBadges statuses={statuses} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StudentActivityBadge({ student }: { student: Student }) {
  const paused = isStudentPaused(student);

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium ${
        paused
          ? 'border-zinc-600 bg-zinc-800/80 text-zinc-400'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      }`}
    >
      {paused ? 'Пауза' : 'Активный'}
    </span>
  );
}

function StudentMobileCard({
  student,
  stats,
  statuses,
  onEdit,
}: {
  student: Student;
  stats: ReturnType<typeof computeStudentAdminStats>;
  statuses: StudentAdminStatus[];
  onEdit: () => void;
}) {
  return (
    <article
      className={`rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 ${
        isStudentPaused(student) ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white">{student.name}</h3>
            <StudentActivityBadge student={student} />
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            {student.gradeClass} класс
          </p>
        </div>
        <RemainingBadge value={stats.remainingLessons} />
      </div>

      {student.parentContacts && (
        <p className="mt-2 text-xs text-zinc-500">{student.parentContacts}</p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Stat label="Ставка / 4 нед" value={formatMoney(student.rate4Weeks)} />
        <Stat label="В неделю" value={String(student.lessonsPerWeek)} />
        <Stat label="1 занятие" value={formatMoney(student.ratePerLesson)} accent />
        <Stat label="Проведено" value={String(stats.conductedLessons)} />
        <Stat
          label="Ср. ДЗ"
          value={formatAverageHomeworkShort(stats.averageHomeworkScore)}
        />
      </dl>

      <div className="mt-3">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Статусы
        </p>
        <StudentStatusBadges statuses={statuses} />
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-3">
        <StudentCabinetLinkActions token={student.token} compact />
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
        >
          Редактировать
        </button>
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className={accent ? 'font-medium text-[#6B93FF]' : 'text-zinc-300'}>
        {value}
      </dd>
    </div>
  );
}

const statusStyles: Record<
  StudentAdminStatus['id'],
  string
> = {
  pending_payment:
    'border-amber-500/30 bg-amber-500/10 text-amber-200',
  negative_balance:
    'border-red-500/30 bg-red-500/10 text-red-300',
  no_schedule:
    'border-orange-500/30 bg-orange-500/10 text-orange-200',
  many_absences:
    'border-yellow-500/30 bg-yellow-500/10 text-yellow-200',
};

function StudentStatusBadges({
  statuses,
}: {
  statuses: StudentAdminStatus[];
}) {
  if (statuses.length === 0) {
    return <span className="text-xs text-zinc-600">—</span>;
  }

  return (
    <div className="flex max-w-[168px] flex-col gap-1">
      {statuses.map((status) => (
        <span
          key={status.id}
          title={status.label}
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-tight ${statusStyles[status.id]}`}
        >
          <span aria-hidden>{status.emoji}</span>
          <span>{status.label}</span>
        </span>
      ))}
    </div>
  );
}

function ParentContactsCell({ value }: { value?: string }) {
  if (!value) return <span className="text-zinc-600">—</span>;

  const [expanded, setExpanded] = useState(false);
  const isLong = value.length > 60;

  if (!isLong) {
    return <span className="text-xs leading-relaxed">{value}</span>;
  }

  return (
    <div>
      <p className={`text-xs leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
        {value}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-0.5 text-[10px] text-[#6B93FF]"
      >
        {expanded ? 'Свернуть' : 'Ещё'}
      </button>
    </div>
  );
}

function RemainingBadge({ value }: { value: number }) {
  const isNegative = value < 0;

  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
        isNegative
          ? 'border border-red-500/35 bg-red-500/10 text-red-400'
          : 'text-zinc-300'
      }`}
    >
      {formatRemainingLessons(value)}
    </span>
  );
}
