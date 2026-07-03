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
  errorMessage: string | null;
  refetch: () => Promise<void>;
}

export function useMyAssignments({
  assignmentStatus,
  pageSize = 20,
  enabled = true,
}: UseMyAssignmentsParams = {}): UseMyAssignmentsResult {
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await cleanupAssignmentService.getMyTasks({ assignmentStatus, pageSize });
      setItems(normalizeMyTasksItems(res.data.data));
    } catch {
      setErrorMessage('Không tải được danh sách nhiệm vụ. Vui lòng thử lại.');
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
      items,
      isLoading,
      errorMessage,
      refetch,
    }),
    [items, isLoading, errorMessage, refetch],
  );
}
