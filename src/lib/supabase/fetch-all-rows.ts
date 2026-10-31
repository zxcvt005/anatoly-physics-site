/** Default PostgREST max_rows. Each page must stay within this cap. */
export const SUPABASE_PAGE_SIZE = 1000;
const PAGINATION_SAFETY_LIMIT = 200_000;

export interface SupabasePageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
}

export async function fetchAllSupabaseRows<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => Promise<SupabasePageResult<T>>,
  options: {
    idOf: (row: T) => string;
    pageSize?: number;
  },
): Promise<{ ok: true; data: T[] } | { ok: false; error: string }> {
  const pageSize = options.pageSize ?? SUPABASE_PAGE_SIZE;

  const load = async (): Promise<
    { ok: true; data: T[]; totalCount?: number } | { ok: false; error: string }
  > => {
    const rows: T[] = [];
    const seen = new Set<string>();
    let from = 0;
    let totalCount: number | undefined;

    for (;;) {
      const to = from + pageSize - 1;
      const { data, error, count } = await fetchPage(from, to);

      if (error) {
        return { ok: false, error: error.message };
      }

      if (typeof count === 'number') {
        totalCount = count;
      }

      const page = data ?? [];
      for (const row of page) {
        const id = options.idOf(row);
        if (seen.has(id)) continue;
        seen.add(id);
        rows.push(row);
      }

      if (page.length < pageSize) {
        return { ok: true, data: rows, totalCount };
      }

      from += pageSize;
      if (from >= PAGINATION_SAFETY_LIMIT) {
        return {
          ok: false,
          error: `Pagination exceeded safety limit of ${PAGINATION_SAFETY_LIMIT} rows`,
        };
      }
    }
  };

  const first = await load();
  if (!first.ok) return first;

  // Concurrent inserts can shift range indexes. If the first pass is short
  // versus the count observed at the start, reload once for a consistent set.
  if (first.totalCount != null && first.data.length < first.totalCount) {
    const second = await load();
    if (!second.ok) return second;
    return { ok: true, data: second.data };
  }

  return { ok: true, data: first.data };
}
