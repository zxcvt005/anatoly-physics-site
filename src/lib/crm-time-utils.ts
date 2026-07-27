/** HH:mm (24h) helpers for CRM lesson and slot time fields. */

export function normalizeHmTime(time: string): string {
  return time.trim().slice(0, 5);
}

function hmToMinutes(time: string): number {
  const [hours, minutes] = normalizeHmTime(time).split(':').map(Number);
  return hours * 60 + minutes;
}

/** Adds one hour; wraps at midnight (23:30 → 00:30). */
export function addOneHourToTime(time: string): string {
  const totalMinutes = (hmToMinutes(time) + 60) % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Valid when end is after start on the clock, including ranges that cross midnight
 * (e.g. 23:30–00:30 on the same lesson date).
 */
export function isHmTimeRangeValid(startTime: string, endTime: string): boolean {
  const startMinutes = hmToMinutes(startTime);
  const endMinutesRaw = hmToMinutes(endTime);

  if (endMinutesRaw === startMinutes) {
    return false;
  }

  let endMinutes = endMinutesRaw;
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes > startMinutes;
}

export function handleStartTimeChange(
  startTime: string,
  setStartTime: (value: string) => void,
  setEndTime: (value: string) => void,
): void {
  setStartTime(startTime);
  setEndTime(addOneHourToTime(startTime));
}
