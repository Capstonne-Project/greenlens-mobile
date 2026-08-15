/** Loại chỉ số tiến độ badge — xem docs/fe-mobile-badge-progress-api-guide.md §3 */
export type BadgeProgressMetric =
  | 'verified_reports'
  | 'points'
  | 'streak_days'
  | 'duplicate_reports'
  | 'reporter_count'
  | 'cleanup_events';

export interface BadgeCatalogItem {
  badgeId: string;
  code: string;
  nameVi: string;
  nameEn: string;
  description?: string | null;
  iconUrl?: string | null;
  isUnlocked: boolean;
  awardedAt?: string | null;
  requiredPoints?: number | null;
  requiredReportCount?: number | null;
  requiredStreakDays?: number | null;
  isFeatured: boolean;
  /** Giá trị hiện tại của user trên trục tiến độ badge. Null nếu badge không có thang đo số hoặc đã unlock. */
  currentProgressValue?: number | null;
  /** Mốc cần đạt để unlock — nguồn chuẩn thay cho requiredPoints/requiredReportCount/requiredStreakDays. */
  targetProgressValue?: number | null;
  /** Loại chỉ số — dùng để chọn label UI đúng cho mọi badge, kể cả duplicate/community/cleanup. */
  progressMetric?: BadgeProgressMetric | null;
}

/** Huy hiệu người dùng chọn hiển thị nổi bật trên hồ sơ (BR-GAM-004) */
export interface FeaturedBadge {
  badgeId: string;
  nameVi: string;
  nameEn: string;
  iconUrl?: string | null;
}

export type LeaderboardPeriod = 'AllTime' | 'Weekly' | 'Monthly' | 'Yearly';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  points: number;
  level: number;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  year?: number | null;
  month?: number | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  entries: LeaderboardEntry[];
}

export interface GetLeaderboardParams {
  period?: LeaderboardPeriod;
  top?: number;
  year?: number;
  month?: number;
}
