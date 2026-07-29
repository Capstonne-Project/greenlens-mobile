import { useCallback, useEffect, useState } from 'react';

import { communityCleanupService } from '@/services/communityCleanup.service';
import type { CommunityCleanupEventDetail } from '@/types/community-cleanup.types';
import { getApiErrorMessage } from '@/utils/api-error-message';

interface UseReportCommunityCleanupResult {
  event: CommunityCleanupEventDetail | null;
  isLoading: boolean;
  isJoining: boolean;
  joinError: string | null;
  refetch: () => Promise<void>;
  join: () => Promise<boolean>;
}

/** Chương trình dọn cộng đồng đang active của một report (nếu có) — dùng cho report detail. */
export function useReportCommunityCleanup(
  reportId: string | undefined,
  enabled = true,
): UseReportCommunityCleanupResult {
  const [event, setEvent] = useState<CommunityCleanupEventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!reportId) return;
    setIsLoading(true);
    try {
      const res = await communityCleanupService.getActiveByReportId(reportId);
      setEvent(res.data.data);
    } catch {
      setEvent(null);
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (!enabled || !reportId) return;
    void refetch();
  }, [enabled, reportId, refetch]);

  const join = useCallback(async () => {
    if (!event) return false;
    setIsJoining(true);
    setJoinError(null);
    try {
      await communityCleanupService.join(event.id);
      await refetch();
      return true;
    } catch (error) {
      setJoinError(getApiErrorMessage(error, 'Không thể tham gia. Vui lòng thử lại.'));
      return false;
    } finally {
      setIsJoining(false);
    }
  }, [event, refetch]);

  return { event, isLoading, isJoining, joinError, refetch, join };
}
