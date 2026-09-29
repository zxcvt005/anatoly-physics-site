import type { MemeEventPhase } from './types';

export function memeEventPhase(
  startsAt: string,
  endsAt: string,
  nowMs: number,
): MemeEventPhase {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 'ended';
  }
  if (nowMs < start) return 'scheduled';
  if (nowMs >= end) return 'ended';
  return 'active';
}

export function ruPlural(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(count)) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function formatRemaining(targetIso: string, nowMs: number): string {
  const target = Date.parse(targetIso);
  const diff = target - nowMs;
  if (!Number.isFinite(target) || diff <= 0) {
    return 'Завершено';
  }

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
  const minutes = totalMinutes - days * 24 * 60 - hours * 60;

  if (days > 0) {
    return `Осталось ${days} ${ruPlural(days, 'день', 'дня', 'дней')} ${hours} ${ruPlural(hours, 'час', 'часа', 'часов')}`;
  }

  if (hours > 0) {
    return `Осталось ${hours} ${ruPlural(hours, 'час', 'часа', 'часов')} ${minutes} ${ruPlural(minutes, 'минуту', 'минуты', 'минут')}`;
  }

  const shownMinutes = Math.max(1, minutes);
  return `Осталось ${shownMinutes} ${ruPlural(shownMinutes, 'минуту', 'минуты', 'минут')}`;
}

export function formatCountdownBadge(label: string): string {
  return label.replace(/^Осталось\s+/i, '').toLocaleUpperCase('ru-RU');
}
