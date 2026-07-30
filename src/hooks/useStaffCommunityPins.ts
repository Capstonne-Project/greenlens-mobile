import { useCallback, useEffect, useState } from 'react';

import { communityCleanupService } from '@/services/communityCleanup.service';
import { colors } from '@/theme/colors';
import type {
  CommunityCleanupListItem,
  CommunityCleanupStatus,
} from '@/types/community-cleanup.types';

/** Màu pin theo tiến độ chương trình — phân biệt với pin nhiệm vụ thường. */
const COMMUNITY_STATUS_COLOR: Record<CommunityCleanupStatus, string> = {
  OpenForJoin: '#0EA5E9',
  JoinClosed: '#6366F1',
  InProgress: '#8B5CF6',
  PendingVerification: '#D946EF',
  Completed: colors.primary,
  Cancelled: '#9CA3AF',
};

export interface StaffCommunityPin {
  id: string;
  reportId: string;
  reportCode: string;
  title: string;
  latitude: number;
  longitude: number;
  status: CommunityCleanupStatus;
  color: string;
  participantCount: number;
  maxParticipants: number;
  spotsLeft: number;
  progressPercent: number;
  startsAt: string;
  thumbnailUrl: string | null;
}

function itemToPin(item: CommunityCleanupListItem): StaffCommunityPin | null {
  if (!item.reportLatitude || !item.reportLongitude) return null;
  return {
    id: item.id,
    reportId: item.reportId,
    reportCode: item.reportCode,
    title: item.title,
    latitude: item.reportLatitude,
    longitude: item.reportLongitude,
    status: item.status,
    color: COMMUNITY_STATUS_COLOR[item.status] ?? colors.textSecondary,
    participantCount: item.participantCount,
    maxParticipants: item.maxParticipants,
    spotsLeft: item.spotsLeft,
    progressPercent: item.progressPercent,
    startsAt: item.startsAt,
    thumbnailUrl: item.thumbnailUrl,
  };
}

/**
 * Pin chương trình dọn rác cộng đồng mà người dùng hiện tại **đang dẫn dắt**.
 * Chỉ Cleaner/Admin gọi được `led-by-me` — role khác sẽ trả 403 và hook trả list rỗng
 * (map vẫn hiển thị bình thường với pin nhiệm vụ).
 */
export function useStaffCommunityPins(enabled = true) {
  const [pins, setPins] = useState<StaffCommunityPin[]>([]);
  const [isLoading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await communityCleanupService.getLedByMe({ page: 1, pageSize: 100 });
      setPins(
        res.data.data.items
          .map(itemToPin)
          .filter((p): p is StaffCommunityPin => p !== null),
      );
    } catch {
      // Không phải leader (403) hoặc lỗi mạng — map vẫn dùng được, chỉ thiếu lớp cộng đồng.
      setPins([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { pins, isLoading, refetch: load };
}
