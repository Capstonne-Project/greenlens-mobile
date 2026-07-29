import { api } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type { BadgeCatalogItem, GetLeaderboardParams, LeaderboardResponse } from '@/types/gamification.types';

export const gamificationService = {
  getBadgeCatalog: () => api.get<ApiEnvelope<BadgeCatalogItem[]>>('/gamification/badges'),

  getLeaderboard: (params: GetLeaderboardParams = {}) =>
    api.get<ApiEnvelope<LeaderboardResponse>>('/gamification/leaderboard', {
      params: {
        period: params.period ?? 'AllTime',
        top: params.top ?? 10,
        ...(params.year ? { year: params.year } : {}),
        ...(params.month ? { month: params.month } : {}),
      },
    }),

  /** Truyền null để bỏ hiển thị huy hiệu nổi bật trên hồ sơ */
  setFeaturedBadge: (badgeId: string | null) =>
    api.put<ApiEnvelope<{ featuredBadgeId: string | null }>>('/gamification/featured-badge', { badgeId }),
};
