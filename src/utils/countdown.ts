import { useEffect, useState } from 'react';

export interface CountdownParts {
  totalMs: number;
  overdue: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Ví dụ: "2h 15m", "45m 12s", "Quá 1h 3m" */
  label: string;
}

export function getCountdownParts(deadlineIso: string | null | undefined, nowMs = Date.now()): CountdownParts | null {
  if (!deadlineIso) return null;
  const target = new Date(deadlineIso).getTime();
  if (Number.isNaN(target)) return null;

  const totalMs = target - nowMs;
  const overdue = totalMs <= 0;
  const abs = Math.abs(totalMs);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const seconds = Math.floor((abs % 60_000) / 1000);

  const chunks: string[] = [];
  if (days > 0) chunks.push(`${days}d`);
  if (hours > 0 || days > 0) chunks.push(`${hours}h`);
  if (days === 0) chunks.push(`${minutes}m`);
  if (days === 0 && hours === 0) chunks.push(`${seconds}s`);

  const label = `${overdue ? 'Quá ' : ''}${chunks.join(' ')}`.trim();

  return { totalMs, overdue, days, hours, minutes, seconds, label };
}

/** Tick mỗi giây để cập nhật countdown. */
export function useDeadlineCountdown(deadlineIso: string | null | undefined): CountdownParts | null {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadlineIso) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadlineIso]);

  return getCountdownParts(deadlineIso, now);
}

/** Fallback khi BE chưa trả declineDeadlineAt — AssignedAt + 24h */
export const DECLINE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function resolveDeclineDeadline(
  declineDeadlineAt: string | null | undefined,
  assignedAt: string | null | undefined,
): string | null {
  if (declineDeadlineAt) return declineDeadlineAt;
  if (!assignedAt) return null;
  return new Date(new Date(assignedAt).getTime() + DECLINE_WINDOW_MS).toISOString();
}

/** Fallback progress due: (progressUpdatedAt ?? startedAt ?? assignedAt) + 24h */
export function resolveProgressRequiredBy(
  progressRequiredByAt: string | null | undefined,
  progressUpdatedAt: string | null | undefined,
  startedAt: string | null | undefined,
  assignedAt: string | null | undefined,
): string | null {
  if (progressRequiredByAt) return progressRequiredByAt;
  const anchor = progressUpdatedAt ?? startedAt ?? assignedAt;
  if (!anchor) return null;
  return new Date(new Date(anchor).getTime() + DECLINE_WINDOW_MS).toISOString();
}
