'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EgeCheckerAnswerGrid } from '@/components/tools/ege-checker/EgeCheckerAnswerGrid';
import { EgeCheckerAnswerInput } from '@/components/tools/ege-checker/EgeCheckerAnswerInput';
import { EgeCheckerManualPart } from '@/components/tools/ege-checker/EgeCheckerManualPart';
import { EgeCheckerReferenceEditor } from '@/components/tools/ege-checker/EgeCheckerReferenceEditor';
import { EgeCheckerResult } from '@/components/tools/ege-checker/EgeCheckerResult';
import {
  QUESTION_COUNT,
  QUESTION_TYPE_LABELS,
  createEmptyAnswerMap,
  createEmptyManualScoreMap,
  getNextQuestionNumber,
  getPreviousQuestionNumber,
  getQuestionRule,
} from '@/lib/tools/ege-checker/constants';
import {
  areReferencesComplete,
  calculateExamScore,
  clampManualScore,
  formatScoreFraction,
  formatScoreMark,
  formatScoreStatusLabel,
  getMissingReferenceNumbers,
  hasAnyManualScores,
  hasAnyStudentAnswers,
} from '@/lib/tools/ege-checker/scoring';
import {
  readStoredReferences,
  writeStoredReferences,
} from '@/lib/tools/ege-checker/storage';
import type { AnswerMap, ManualScoreMap } from '@/lib/tools/ege-checker/types';

type CheckerMode = 'check' | 'references';

const SAVE_DEBOUNCE_MS = 400;

function createEmptySubmitted(): Record<string, boolean> {
  const submitted: Record<string, boolean> = {};
  for (let number = 1; number <= QUESTION_COUNT; number += 1) {
    submitted[String(number)] = false;
  }
  return submitted;
}

export function EgeChecker() {
  const [mode, setMode] = useState<CheckerMode>('check');
  const [references, setReferences] = useState<AnswerMap>(createEmptyAnswerMap);
  const [answers, setAnswers] = useState<AnswerMap>(createEmptyAnswerMap);
  const [manualScores, setManualScores] = useState<ManualScoreMap>(
    createEmptyManualScoreMap,
  );
  const [submitted, setSubmitted] = useState<Record<string, boolean>>(createEmptySubmitted);
  const [currentNumber, setCurrentNumber] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const savedNoticeTimerRef = useRef<number | null>(null);
  const advanceLockRef = useRef(false);

  useEffect(() => {
    setReferences(readStoredReferences());
    setIsHydrated(true);
  }, []);

  const persistReferences = useCallback((next: AnswerMap) => {
    writeStoredReferences(next);
  }, []);

  const schedulePersist = useCallback(
    (next: AnswerMap) => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        persistReferences(next);
        saveTimerRef.current = null;
      }, SAVE_DEBOUNCE_MS);
    },
    [persistReferences],
  );

  const persistNow = useCallback(
    (next: AnswerMap) => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      persistReferences(next);
    },
    [persistReferences],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      if (savedNoticeTimerRef.current !== null) {
        window.clearTimeout(savedNoticeTimerRef.current);
      }
    };
  }, []);

  const showSavedNotice = useCallback(() => {
    setSavedNotice(true);
    if (savedNoticeTimerRef.current !== null) {
      window.clearTimeout(savedNoticeTimerRef.current);
    }
    savedNoticeTimerRef.current = window.setTimeout(() => {
      setSavedNotice(false);
    }, 1600);
  }, []);

  const missingReferences = useMemo(
    () => getMissingReferenceNumbers(references),
    [references],
  );
  const referencesComplete = missingReferences.length === 0;
  const exam = useMemo(
    () => calculateExamScore(answers, references, manualScores),
    [answers, references, manualScores],
  );
  const total = exam.firstPart;
  const currentRule = getQuestionRule(currentNumber);
  const currentKey = String(currentNumber);
  const currentResult = submitted[currentKey]
    ? total.questions.find((question) => question.number === currentNumber)
    : undefined;
  const resultsByNumber = useMemo(() => {
    const map: Record<string, (typeof total.questions)[number]> = {};
    for (const question of total.questions) {
      map[String(question.number)] = question;
    }
    return map;
  }, [total.questions]);

  const headerPrimary = isComplete
    ? exam.primaryScore
    : total.questions.reduce((sum, question) => {
        return submitted[String(question.number)] ? sum + question.score : sum;
      }, 0);
  const headerSecondary = isComplete ? exam.testScore : total.max;

  const updateReference = useCallback(
    (number: number, value: string) => {
      setReferences((current) => {
        const next = { ...current, [String(number)]: value };
        schedulePersist(next);
        return next;
      });
    },
    [schedulePersist],
  );

  const handleReferenceBlur = useCallback(() => {
    setReferences((current) => {
      persistNow(current);
      return current;
    });
  }, [persistNow]);

  const handleReferenceEnter = useCallback(
    (number: number) => {
      setReferences((current) => {
        persistNow(current);
        return current;
      });
      if (number >= QUESTION_COUNT) {
        setMode('check');
        setCurrentNumber(1);
      }
    },
    [persistNow],
  );

  const handleSaveReferences = useCallback(() => {
    persistNow(references);
    showSavedNotice();
  }, [persistNow, references, showSavedNotice]);

  const handleClearReferences = useCallback(() => {
    const confirmed = window.confirm('Очистить все эталонные ответы?');
    if (!confirmed) {
      return;
    }

    const empty = createEmptyAnswerMap();
    setReferences(empty);
    persistNow(empty);
  }, [persistNow]);

  const submitCurrent = useCallback(
    (move: 'next' | 'previous') => {
      if (!areReferencesComplete(references)) {
        setMode('check');
        return;
      }

      if (advanceLockRef.current) {
        return;
      }
      advanceLockRef.current = true;
      window.setTimeout(() => {
        advanceLockRef.current = false;
      }, 80);

      setSubmitted((current) => {
        if (currentNumber === QUESTION_COUNT && move === 'next') {
          const allSubmitted = createEmptySubmitted();
          for (let number = 1; number <= QUESTION_COUNT; number += 1) {
            allSubmitted[String(number)] = true;
          }
          return allSubmitted;
        }

        return { ...current, [String(currentNumber)]: true };
      });

      if (currentNumber === QUESTION_COUNT && move === 'next') {
        setIsComplete(true);
        return;
      }

      if (move === 'next') {
        const next = getNextQuestionNumber(currentNumber);
        if (next) {
          setCurrentNumber(next);
        }
        return;
      }

      if (move === 'previous') {
        const previous = getPreviousQuestionNumber(currentNumber);
        if (previous) {
          setCurrentNumber(previous);
        }
      }
    },
    [currentNumber, references],
  );

  const handleSelectQuestion = useCallback((number: number) => {
    setCurrentNumber(number);
  }, []);

  const handleManualScoreChange = useCallback((number: number, score: number) => {
    setManualScores((current) => ({
      ...current,
      [String(number)]: clampManualScore(number, score),
    }));
  }, []);

  const handleNewWork = useCallback(() => {
    if (hasAnyStudentAnswers(answers) || hasAnyManualScores(manualScores) || isComplete) {
      const confirmed = window.confirm(
        'Очистить ответы ученика и начать новую работу? Эталоны останутся.',
      );
      if (!confirmed) {
        return;
      }
    }

    setAnswers(createEmptyAnswerMap());
    setManualScores(createEmptyManualScoreMap());
    setSubmitted(createEmptySubmitted());
    setIsComplete(false);
    setCurrentNumber(1);
    setMode('check');
  }, [answers, isComplete, manualScores]);

  const handleAnswerChange = useCallback((value: string) => {
    setAnswers((current) => ({
      ...current,
      [String(currentNumber)]: value,
    }));
  }, [currentNumber]);

  if (!isHydrated) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 px-6 py-16 text-center text-zinc-500">
        Загрузка инструмента…
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="rounded-3xl border border-zinc-800 bg-zinc-950/80 px-5 py-6 backdrop-blur-sm sm:px-8 sm:py-8">
        <p className="mb-2 text-sm uppercase tracking-[0.35em] text-zinc-400">Не физика</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Проверка первой части ЕГЭ</h1>
            <p className="mt-2 text-base text-zinc-400 sm:text-lg">
              Эталон один раз, затем быстрая проверка работ
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums text-white sm:text-4xl">
              {headerPrimary} / {headerSecondary}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {isComplete ? 'первичные / тестовые' : 'первая часть'}
            </p>
          </div>
        </div>
      </header>

      {!referencesComplete && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Заполнено {QUESTION_COUNT - missingReferences.length} из {QUESTION_COUNT} эталонов
          {missingReferences.length > 0 ? `. Не заполнены: ${missingReferences.join(', ')}` : ''}
        </div>
      )}

      <div
        className="grid grid-cols-2 rounded-2xl border border-zinc-800 bg-black/40 p-1"
        role="tablist"
        aria-label="Режим инструмента"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'check'}
          onClick={() => setMode('check')}
          className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            mode === 'check'
              ? 'bg-[#3166F0] text-white shadow-[0_8px_24px_rgba(49,102,240,0.28)]'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
          }`}
        >
          Проверка
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'references'}
          onClick={() => setMode('references')}
          className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            mode === 'references'
              ? 'bg-[#3166F0] text-white shadow-[0_8px_24px_rgba(49,102,240,0.28)]'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
          }`}
        >
          Эталоны
        </button>
      </div>

      {mode === 'references' ? (
        <EgeCheckerReferenceEditor
          references={references}
          savedNotice={savedNotice}
          onChange={updateReference}
          onBlur={() => handleReferenceBlur()}
          onEnter={handleReferenceEnter}
          onSave={handleSaveReferences}
          onClear={handleClearReferences}
        />
      ) : !referencesComplete ? (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 px-5 py-10 text-center sm:px-8">
          <h2 className="text-xl font-semibold text-white">Сначала заполните эталоны</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
            Для проверки работы нужны правильные ответы на все 20 заданий.
            {missingReferences.length > 0
              ? ` Сейчас не заполнены: ${missingReferences.join(', ')}.`
              : ''}
          </p>
          <button
            type="button"
            onClick={() => setMode('references')}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#3166F0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2856d4]"
          >
            Заполнить эталоны
          </button>
        </section>
      ) : (
        <div className="space-y-5">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 px-5 py-6 backdrop-blur-sm sm:px-8 sm:py-8">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitCurrent('next');
              }}
              className="space-y-5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                    Первая часть · автоматическая проверка
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                    Задание {currentNumber} / {QUESTION_COUNT}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {QUESTION_TYPE_LABELS[currentRule.type]}
                  </p>
                </div>
                <p className="text-sm font-medium text-zinc-400">
                  максимум {currentRule.maxScore}
                </p>
              </div>

              <EgeCheckerAnswerInput
                id={`ege-answer-${currentNumber}`}
                label="Ответ ученика"
                value={answers[currentKey] ?? ''}
                enterKeyHint={currentNumber === QUESTION_COUNT ? 'done' : 'next'}
                autoFocus
                onChange={handleAnswerChange}
                onEnter={() => submitCurrent('next')}
                onShiftEnter={() => submitCurrent('previous')}
              />

              {currentResult ? (
                <p
                  className={`text-base font-semibold ${
                    currentResult.status === 'correct'
                      ? 'text-emerald-300'
                      : currentResult.status === 'partial'
                        ? 'text-amber-200'
                        : 'text-red-400'
                  }`}
                >
                  {formatScoreMark(currentResult.score, currentResult.maxScore)}{' '}
                  {formatScoreFraction(currentResult.score, currentResult.maxScore)}
                  <span className="ml-2 font-medium">
                    {formatScoreStatusLabel(currentResult.status)}
                  </span>
                </p>
              ) : null}

              <p className="text-sm text-zinc-500">Enter → следующее</p>
            </form>
          </section>

          {isComplete ? (
            <>
              <EgeCheckerResult result={exam} />
              <EgeCheckerManualPart
                scores={manualScores}
                onChange={handleManualScoreChange}
              />
            </>
          ) : null}

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 px-5 py-5 sm:px-6">
            <p className="mb-3 text-sm text-zinc-500">Задания 1–20</p>
            <EgeCheckerAnswerGrid
              currentNumber={currentNumber}
              submitted={submitted}
              resultsByNumber={resultsByNumber}
              onSelect={handleSelectQuestion}
            />
            <div className="mt-5">
              <button
                type="button"
                onClick={handleNewWork}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[#3166F0]/50 hover:bg-zinc-900 sm:w-auto"
              >
                Новая работа
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
