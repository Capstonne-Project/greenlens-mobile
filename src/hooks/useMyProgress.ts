import { useCallback, useEffect, useMemo, useState } from 'react';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import type { AssignmentStatus, MyProgressResponse, ProgressHistoryItem } from '@/types/cleanup-assignment.types';

interface UseMyProgressParams {
  assignmentStatus?: AssignmentStatus;
  pageSize?: number;
  enabled?: boolean;
}

interface UseMyProgressResult {
  items: ProgressHistoryItem[];
  totalCount: number;
  isLoading: boolean;
  errorMessage: string | null;
  refetch: () => Promise<void>;
}

export function useMyProgress({
  assignmentStatus,
  pageSize = 20,
  enabled = true,
}: UseMyProgressParams = {}): UseMyProgressResult {
  const [data, setData]             = useState<MyProgressResponse | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [errorMessage, setErrorMsg] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await cleanupAssignmentService.getMyProgress({ assignmentStatus, pageSize });
      setData(res.data.data);
    } catch {
      setErrorMsg('Không tải được lịch sử. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [assignmentStatus, pageSize]);

  useEffect(() => {
    if (!enabled) return;
    void refetch();
  }, [enabled, refetch]);

  return useMemo(
    () => ({
      items: data?.items ?? [],
      totalCount: data?.totalCount ?? 0,
      isLoading,
      errorMessage,
      refetch,
    }),
    [data, isLoading, errorMessage, refetch],
  );
}
