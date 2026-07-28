import { useCallback, useEffect, useMemo, useState } from 'react';

import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import type { AssignmentItem, AssignmentStatus } from '@/types/cleanup-assignment.types';
import { normalizeMyTasksItems } from '@/utils/field-worker-task';

interface UseMyAssignmentsParams {
  assignmentStatus?: AssignmentStatus;
  pageSize?: number;
  enabled?: boolean;
}

interface UseMyAssignmentsResult {
  items: AssignmentItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  errorMessage: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useMyAssignments({
  assignmentStatus,
  pageSize = 20,
  enabled = true,
}: UseMyAssignmentsParams = {}): UseMyAssignmentsResult {
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await cleanupAssignmentService.getMyTasks({ assignmentStatus, pageSize, page: 1 });
      setItems(normalizeMyTasksItems(res.data.data));
      setHasMore(res.data.data.pagination.hasNext);
      setPage(1);
    } catch {
      setErrorMessage('Không tải được danh sách nhiệm vụ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [assignmentStatus, pageSize]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await cleanupAssignmentService.getMyTasks({ assignmentStatus, pageSize, page: nextPage });
      setItems((prev) => [...prev, ...normalizeMyTasksItems(res.data.data)]);
      setHasMore(res.data.data.pagination.hasNext);
      setPage(nextPage);
    } catch {
      // Giữ nguyên danh sách hiện tại — không báo lỗi để không gián đoạn cuộn.
    } finally {
      setIsLoadingMore(false);
    }
  }, [assignmentStatus, pageSize, page, isLoading, isLoadingMore, hasMore]);

  useEffect(() => {
    if (!enabled) return;
    void refetch();
  }, [enabled, refetch]);

  return useMemo(
    () => ({
      items,
      isLoading,
      isLoadingMore,
      hasMore,
      errorMessage,
      refetch,
      loadMore,
    }),
    [items, isLoading, isLoadingMore, hasMore, errorMessage, refetch, loadMore],
  );
}
