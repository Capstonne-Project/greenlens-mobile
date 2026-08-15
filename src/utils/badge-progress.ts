import type { BadgeCatalogItem, BadgeProgressMetric } from '@/types/gamification.types';

/** Label đơn vị theo progressMetric — docs/fe-mobile-badge-progress-api-guide.md §3 */
const PROGRESS_UNIT_VI: Record<BadgeProgressMetric, string> = {
  verified_reports: 'báo cáo',
  points: 'điểm',
  streak_days: 'ngày',
  duplicate_reports: 'báo cáo trùng',
  reporter_count: 'người cùng báo cáo',
  cleanup_events: 'buổi dọn dẹp',
};

export interface BadgeProgress {
  current: number;
  target: number;
  /** 0..1 */
  ratio: number;
  percent: number;
  unit: string;
  /** "{current}/{target} {unit}" — null nếu badge không có thang đo số (progressMetric/target thiếu). */
  label: string | null;
}

/**
 * Tiến độ badge chuẩn hoá từ progressMetric/targetProgressValue — thay cho việc suy ra
 * qua requiredPoints/requiredReportCount/requiredStreakDays (bỏ sót duplicate_reports,
 * reporter_count, cleanup_events dù BE đã trả progress đầy đủ cho các badge đó).
 */
export function getBadgeProgress(badge: BadgeCatalogItem): BadgeProgress | null {
  const target = badge.targetProgressValue ?? null;
  if (!badge.progressMetric || target == null || target <= 0) return null;

  const current = badge.currentProgressValue ?? 0;
  const ratio = badge.isUnlocked ? 1 : Math.min(1, Math.max(0, current / target));
  const unit = PROGRESS_UNIT_VI[badge.progressMetric];
  const clampedCurrent = Math.min(current, target);

  return {
    current,
    target,
    ratio,
    percent: Math.round(ratio * 100),
    unit,
    label: `${clampedCurrent}/${target} ${unit}`,
  };
}
