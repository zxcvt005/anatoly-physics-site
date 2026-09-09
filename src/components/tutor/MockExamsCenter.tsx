'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { MockExamFormModal } from '@/components/tutor/MockExamFormModal';
import { MockExamsTable } from '@/components/tutor/MockExamsTable';
import { computeExamFillStats } from '@/lib/mock-exams/calculations';
import type { MockExam } from '@/lib/mock-exams/types';
import {
  MockExamsProvider,
  useMockExams,
} from '@/providers/MockExamsProvider';
import type { Student } from '@/types/tutor';

type MockExamsCenterProps = {
  students: Student[];
};

export function MockExamsCenter({ students }: MockExamsCenterProps) {
  return (
    <MockExamsProvider>
      <MockExamsCenterInner students={students} />
    </MockExamsProvider>
  );
}

function MockExamsCenterInner({ students }: MockExamsCenterProps) {
  const {
    exams,
    resultsByKey,
    isLoading,
    loadError,
    addExam,
    editExam,
    removeExam,
  } = useMockExams();
  const [formOpen, setFormOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState<MockExam | null>(null);
  const [examToDelete, setExamToDelete] = useState<MockExam | null>(null);

  const results = useMemo(() => [...resultsByKey.values()], [resultsByKey]);

  const latestExamStats = useMemo(() => {
    if (exams.length === 0) {
      return null;
    }
    const latest = exams[exams.length - 1]!;
    return {
      exam: latest,
      stats: computeExamFillStats(latest, results, students.length),
    };
  }, [exams, results, students.length]);

  return (
    <div className="space-y-4">
      <MockExamFormModal
        open={formOpen}
        exam={examToEdit}
        onClose={() => {
          setFormOpen(false);
          setExamToEdit(null);
        }}
        onSubmit={async (input) => {
          if (examToEdit) {
            return editExam(examToEdit.id, input);
          }
          return addExam(input);
        }}
      />

      <DeleteMockExamDialog
        exam={examToDelete}
        onClose={() => setExamToDelete(null)}
        onConfirm={async () => {
          if (!examToDelete) {
            return;
          }
          await removeExam(examToDelete.id);
          setExamToDelete(null);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white md:text-lg">
            Пробники
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Таблица ученики × пробники. Балл вводится прямо в клетку.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setExamToEdit(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-[#3166F0]/40 bg-[#3166F0]/10 px-4 py-2 text-sm font-medium text-[#6B93FF] transition hover:border-[#3166F0]/60 hover:bg-[#3166F0]/20 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          Добавить пробник
        </button>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-400">
        <span>
          Пробников:{' '}
          <span className="font-semibold text-white">{exams.length}</span>
        </span>
        <span>
          Учеников:{' '}
          <span className="font-semibold text-white">{students.length}</span>
        </span>
        {latestExamStats ? (
          <>
            <span>
              {latestExamStats.exam.title}: заполнено{' '}
              <span className="font-semibold text-white">
                {latestExamStats.stats.filled} / {latestExamStats.stats.total}
              </span>
            </span>
            {latestExamStats.stats.averageScore !== null ? (
              <span>
                Средний:{' '}
                <span className="font-semibold text-white">
                  {latestExamStats.stats.averageScore.toFixed(1)} /{' '}
                  {latestExamStats.exam.maxScore}
                </span>
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      {isLoading ? (
        <p className="rounded-2xl border border-zinc-800 px-5 py-10 text-center text-zinc-500">
          Загрузка пробников…
        </p>
      ) : loadError ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-10 text-center text-red-300">
          {loadError}
        </p>
      ) : (
        <MockExamsTable
          students={students}
          onEditExam={(exam) => {
            setExamToEdit(exam);
            setFormOpen(true);
          }}
          onDeleteExam={setExamToDelete}
        />
      )}
    </div>
  );
}

function DeleteMockExamDialog({
  exam,
  onClose,
  onConfirm,
}: {
  exam: MockExam | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!exam) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Закрыть"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
      >
        <h2 className="text-lg font-semibold text-white">Удалить пробник?</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Удалить «{exam.title}»? Все выставленные результаты этого пробника
          тоже будут удалены.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-500"
          >
            Удалить
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
