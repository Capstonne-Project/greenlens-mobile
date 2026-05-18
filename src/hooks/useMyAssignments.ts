import { useCallback, useEffect, useMemo, useState } from 'react';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import type { AssignmentItem, AssignmentStatus, MyAssignmentsResponse } from '@/types/cleanup-assignment.types';

interface UseMyAssignmentsParams {
  assignmentStatus?: AssignmentStatus;
  pageSize?: number;
  enabled?: boolean;
}

interface UseMyAssignmentsResult {
  data: MyAssignmentsResponse | null;
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
  const [data, setData] = useState<MyAssignmentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await cleanupAssignmentService.getMyAssignments({ assignmentStatus, pageSize });
      setData(res.data.data);
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
      data,
      items: data?.items ?? [],
      isLoading,
      errorMessage,
      refetch,
    }),
    [data, isLoading, errorMessage, refetch],
  );
}
