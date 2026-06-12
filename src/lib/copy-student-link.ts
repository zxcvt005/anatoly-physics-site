export function buildStudentCabinetUrl(token: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/student/${token}`;
  }
  return `/student/${token}`;
}

export type CopyStudentLinkResult =
  | { ok: true }
  | { ok: false; url: string };

export async function copyStudentCabinetLink(
  token: string,
): Promise<CopyStudentLinkResult> {
  const url = buildStudentCabinetUrl(token);

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return { ok: true };
    } catch {
      return { ok: false, url };
    }
  }

  return { ok: false, url };
}
