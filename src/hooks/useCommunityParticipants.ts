import { useCallback, useState } from 'react';

import { communityCleanupService } from '@/services/communityCleanup.service';
import { getApiErrorMessage } from '@/utils/api-error-message';
import type { CommunityCleanupParticipant } from '@/types/community-cleanup.types';

export function useCommunityParticipants(eventId: string | undefined) {
  const [participants, setParticipants] = useState<CommunityCleanupParticipant[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await communityCleanupService.getParticipants(eventId, { page: 1, pageSize: 100 });
      setParticipants(res.data.data.items);
      setHasLoaded(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải danh sách người tham gia.'));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  return { participants, isLoading, errorMessage, hasLoaded, load };
}
