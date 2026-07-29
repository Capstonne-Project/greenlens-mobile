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
  isFeatured: boolean;
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
