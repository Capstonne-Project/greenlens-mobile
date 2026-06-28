import type { MapSummaryDailyCount, MapViewportSummaryData } from '@/types/map-summary.types';
import type { PublicMapReportDto } from '@/types/public-map.types';

function toIsoDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** BE có thể trả camelCase hoặc PascalCase */
export function normalizeMapSummaryPayload(raw: unknown): MapViewportSummaryData | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;
  const reportCount = readNumber(data.reportCount ?? data.ReportCount);
  const days = readNumber(data.days ?? data.Days, 30);
  const periodStart = readString(data.periodStart ?? data.PeriodStart);
  const periodEnd = readString(data.periodEnd ?? data.PeriodEnd);
  const rawDaily = (data.dailyCounts ?? data.DailyCounts) as unknown;

  if (!Array.isArray(rawDaily)) {
    return {
      reportCount,
      days,
      periodStart,
      periodEnd,
      dailyCounts: [],
    };
  }

  const dailyCounts: MapSummaryDailyCount[] = rawDaily
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const date = readString(row.date ?? row.Date);
      if (!date) return null;
      return { date, count: readNumber(row.count ?? row.Count) };
    })
    .filter((entry): entry is MapSummaryDailyCount => entry != null);

  return { reportCount, days, periodStart, periodEnd, dailyCounts };
}

/**
 * Fallback khi GET /map/summary chưa có hoặc lỗi — tổng hợp từ pin `/map/reports`
 * (cùng bbox; lọc theo `days` ngày gần nhất trên createdAt).
 */
export function buildViewportSummaryFallback(
  items: PublicMapReportDto[],
  days: number,
): MapViewportSummaryData {
  const safeDays = Math.min(90, Math.max(7, days));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const periodEnd = toIsoDateUtc(today);
  const rangeStart = new Date(today);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - (safeDays - 1));
  const periodStart = toIsoDateUtc(rangeStart);

  const dayKeys: string[] = [];
  for (let offset = 0; offset < safeDays; offset += 1) {
    const day = new Date(rangeStart);
    day.setUTCDate(rangeStart.getUTCDate() + offset);
    dayKeys.push(toIsoDateUtc(day));
  }

  const countByDay = new Map<string, number>(dayKeys.map((key) => [key, 0]));
  let reportCount = 0;

  for (const item of items) {
    const createdAt = item.createdAt?.trim();
    if (!createdAt) continue;
    const dateKey = createdAt.slice(0, 10);
    if (!countByDay.has(dateKey)) continue;
    countByDay.set(dateKey, (countByDay.get(dateKey) ?? 0) + 1);
    reportCount += 1;
  }

  return {
    reportCount,
    days: safeDays,
    periodStart,
    periodEnd,
    dailyCounts: dayKeys.map((date) => ({ date, count: countByDay.get(date) ?? 0 })),
  };
}
