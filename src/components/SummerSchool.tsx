'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GiftShop } from '@/components/GiftShop';
import { SummerChecklist } from '@/components/SummerChecklist';

const summerFeatures = [
  {
    title: 'Баллы за активность',
    description:
      'Ученики получают баллы за занятия, домашние задания, дедлайны и участие в интенсивах.',
  },
  {
    title: 'Серии за дисциплину',
    description:
      'Если ученик выполняет задания без пропусков, серия растёт и даёт дополнительные бонусы.',
  },
  {
    title: 'Магазин подарков',
    description:
      'Накопленные баллы можно обменивать на подарки в конце летнего сезона.',
  },
  {
    title: 'Главный розыгрыш в конце лета',
    description:
      'Часть баллов можно вложить в розыгрыш главного приза. Чем больше вложение, тем выше шанс победить.',
  },
  {
    title: 'Летний чек-лист',
    description:
      'Дополнительные баллы можно получать за летние задания: активность, отдых, полезные привычки и маленькие приключения.',
  },
];

const TOP_VISIBLE = 5;
const ROW_HEIGHT_PX = 57;
const TABLE_HEADER_HEIGHT_PX = 49;

type LeaderboardEntry = {
  name: string;
  points: number;
};

function getRowAccent(rank: number, isHighlighted: boolean) {
  if (isHighlighted) {
    return {
      row: 'border-[#3166F0]/50 bg-[#3166F0]/15 shadow-[0_0_24px_rgba(49,102,240,0.2)]',
      rank: 'text-[#3166F0]',
      points: 'text-[#3166F0]',
    };
  }
  if (rank === 1) {
    return {
      row: 'border-amber-400/40 bg-amber-400/10',
      rank: 'text-amber-300',
      points: 'text-amber-200',
    };
  }
  if (rank === 2) {
    return {
      row: 'border-zinc-400/35 bg-zinc-400/10',
      rank: 'text-zinc-200',
      points: 'text-zinc-100',
    };
  }
  if (rank === 3) {
    return {
      row: 'border-orange-600/40 bg-orange-700/15',
      rank: 'text-orange-300',
      points: 'text-orange-200',
    };
  }
  return {
    row: 'border-zinc-800 bg-black/30',
    rank: 'text-zinc-500',
    points: 'text-[#3166F0]',
  };
}

function rowId(name: string) {
  return `leaderboard-row-${name.replace(/\s+/g, '-').toLowerCase()}`;
}

export function SummerSchool() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCardIndex, setOpenCardIndex] = useState<number | null>(null);
  const [isRatingExpanded, setIsRatingExpanded] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedName, setHighlightedName] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const resetTableScroll = useCallback(() => {
    tableScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadLeaderboard() {
      try {
        const response = await fetch('/api/summer-leaderboard');
        const data = (await response.json()) as {
          leaderboard?: LeaderboardEntry[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? 'Ошибка загрузки');
        }

        if (isMounted) {
          setLeaderboard(data.leaderboard ?? []);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('Не удалось загрузить таблицу лидеров. Попробуйте обновить страницу.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    resetTableScroll();
  }, [searchQuery, leaderboard, resetTableScroll]);

  useEffect(() => {
    if (!isRatingExpanded) {
      resetTableScroll();
    }
  }, [isRatingExpanded, resetTableScroll]);

  useEffect(() => {
    if (!highlightedName || !isRatingExpanded) return;

    const timer = window.setTimeout(() => {
      document
        .getElementById(rowId(highlightedName))
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [highlightedName, isRatingExpanded]);

  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 1) return [];

    return leaderboard
      .filter((entry) => entry.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [leaderboard, searchQuery]);

  const hasMoreThanTop = leaderboard.length > TOP_VISIBLE;
  const collapsedTableHeight =
    TABLE_HEADER_HEIGHT_PX + TOP_VISIBLE * ROW_HEIGHT_PX;
  const expandedTableHeight =
    TABLE_HEADER_HEIGHT_PX + leaderboard.length * ROW_HEIGHT_PX;

  const handleSelectStudent = (name: string) => {
    setHighlightedName(name);
    setIsRatingExpanded(true);
    setIsSearchOpen(false);
    setSearchQuery(name);
  };

  return (
    <section id="summer-school" className="scroll-mt-20 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-6 text-center text-4xl font-bold md:text-5xl">
          Летняя школа 2026
        </h2>

        <p className="mx-auto mb-4 max-w-3xl text-center text-lg leading-8 text-zinc-400">
          Лето — это возможность прокачать физику в игровом формате.
        </p>
        <p className="mx-auto mb-12 max-w-3xl text-center text-lg leading-8 text-zinc-400">
          Ученики получают баллы за занятия, домашние задания, дедлайны, интенсивы
          и летний чек-лист. Баллы влияют на место в рейтинге, дают доступ к подаркам
          и повышают шанс выиграть главный приз в конце лета.
        </p>

        <div className="mb-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {summerFeatures.map((feature, index) => {
            const isOpen = openCardIndex === index;

            return (
              <button
                key={feature.title}
                type="button"
                onClick={() => setOpenCardIndex(isOpen ? null : index)}
                className={`rounded-2xl border px-5 py-6 text-left shadow-lg transition-all duration-300 ${
                  isOpen
                    ? 'border-[#3166F0] bg-[#3166F0]/10 shadow-[0_0_32px_rgba(49,102,240,0.15)]'
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                }`}
                aria-expanded={isOpen}
              >
                <p
                  className={`mb-2 font-semibold leading-snug transition-colors duration-300 ${
                    isOpen ? 'text-[#3166F0]' : 'text-white'
                  }`}
                >
                  {feature.title}
                </p>

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pt-1 text-sm leading-6 text-zinc-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl md:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-bold md:text-3xl">Таблица лидеров</h3>
              <p className="mt-2 text-xs leading-5 text-zinc-500 md:text-sm">
                Данные обновляются автоматически. Иногда отображение новых баллов
                может занимать до 5 минут.
              </p>
            </div>

            {!isLoading && !error && leaderboard.length > 0 && (
              <div className="relative w-full sm:w-auto sm:min-w-[280px]">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen((open) => !open)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-200 sm:ml-auto ${
                    isSearchOpen
                      ? 'border-[#3166F0] bg-[#3166F0]/10 text-[#3166F0]'
                      : 'border-zinc-700 bg-black/40 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                  aria-label="Поиск ученика"
                  aria-expanded={isSearchOpen}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
                    <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </button>

                {isSearchOpen && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl sm:w-80">
                    <input
                      ref={searchInputRef}
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Введите имя ученика"
                      className="w-full rounded-xl border border-zinc-700 bg-black/50 px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#3166F0]"
                    />

                    {searchQuery.trim().length > 0 && (
                      <ul className="mt-2 max-h-48 overflow-y-auto">
                        {searchSuggestions.length > 0 ? (
                          searchSuggestions.map((entry) => (
                            <li key={entry.name}>
                              <button
                                type="button"
                                onClick={() => handleSelectStudent(entry.name)}
                                className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-[#3166F0]/10 hover:text-white"
                              >
                                {entry.name}
                              </button>
                            </li>
                          ))
                        ) : (
                          <li className="px-3 py-2 text-sm text-zinc-500">
                            Ничего не найдено
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {isLoading && (
            <p className="text-center text-zinc-500">Загрузка рейтинга…</p>
          )}

          {error && <p className="text-center text-zinc-400">{error}</p>}

          {!isLoading && !error && leaderboard.length === 0 && (
            <p className="text-center text-zinc-500">Пока нет данных для рейтинга.</p>
          )}

          {!isLoading && !error && leaderboard.length > 0 && (
            <>
              <div className="relative">
                <div
                  className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
                  style={{
                    maxHeight: isRatingExpanded
                      ? expandedTableHeight
                      : collapsedTableHeight,
                  }}
                >
                  <div
                    ref={tableScrollRef}
                    className="overflow-x-auto overflow-y-hidden"
                  >
                    <table className="w-full min-w-[320px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-zinc-800 text-sm uppercase tracking-wider text-zinc-500">
                          <th className="px-3 py-3 font-medium md:px-4">Место</th>
                          <th className="px-3 py-3 font-medium md:px-4">Ученик</th>
                          <th className="px-3 py-3 text-right font-medium md:px-4">
                            Баллы
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((entry, index) => {
                          const rank = index + 1;
                          const isHighlighted = highlightedName === entry.name;
                          const accent = getRowAccent(rank, isHighlighted);

                          return (
                            <tr
                              key={`${entry.name}-${rank}`}
                              id={rowId(entry.name)}
                              className={`border-b border-zinc-800/80 transition-colors duration-300 last:border-b-0 ${accent.row}`}
                            >
                              <td
                                className={`px-3 py-4 font-bold md:px-4 ${accent.rank}`}
                              >
                                {rank}
                              </td>
                              <td className="px-3 py-4 font-medium text-white md:px-4">
                                {entry.name}
                              </td>
                              <td
                                className={`px-3 py-4 text-right font-semibold md:px-4 ${accent.points}`}
                              >
                                {entry.points}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {!isRatingExpanded && hasMoreThanTop && (
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent"
                    aria-hidden
                  />
                )}
              </div>

              {hasMoreThanTop && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRatingExpanded((expanded) => {
                        if (expanded) {
                          resetTableScroll();
                        }
                        return !expanded;
                      });
                    }}
                    className="rounded-full border border-zinc-700 bg-black/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#3166F0] hover:text-[#3166F0]"
                  >
                    {isRatingExpanded
                      ? 'Свернуть рейтинг'
                      : 'Развернуть полный рейтинг'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <SummerChecklist />

        <GiftShop />
      </div>
    </section>
  );
}
