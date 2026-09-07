export function uniqueStudentAppIds(studentAppIds: string[]): string[] {
  return [...new Set(studentAppIds)];
}

/** Diff slot↔student membership so existing join rows (and created_at) stay intact. */
export function diffSlotStudentMembership(
  existingStudentAppIds: string[],
  desiredStudentAppIds: string[],
): { toAdd: string[]; toRemove: string[] } {
  const existing = new Set(existingStudentAppIds);
  const desired = new Set(uniqueStudentAppIds(desiredStudentAppIds));

  return {
    toAdd: [...desired].filter((id) => !existing.has(id)),
    toRemove: existingStudentAppIds.filter((id) => !desired.has(id)),
  };
}
