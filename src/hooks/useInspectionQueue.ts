import { useCallback, useEffect, useMemo, useState } from 'react';

import { inspectionService } from '@/services/inspection.service';
import type { ApiPagination } from '@/types/api.types';
import type { InspectionQueueItem } from '@/types/inspection.types';

interface UseInspectionQueueParams {
  status?: string;
  pageSize?: number;
  enabled?: boolean;
}

export function useInspectionQueue({
  status,
  pageSize = 20,
  enabled = true,
}: UseInspectionQueueParams = {}) {
  const [items, setItems] = useState<InspectionQueueItem[]>([]);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await inspectionService.getQueue({ status, pageSize });
      const payload = res.data.data;
      setItems(payload.items);
      setPagination(payload.pagination);
    } catch {
      setError('Không tải được hàng đợi hồ sơ thanh tra.');
    } finally {
      setLoading(false);
    }
  }, [status, pageSize]);

  useEffect(() => {
    if (!enabled) return;
    void refetch();
  }, [enabled, refetch]);

  return useMemo(
    () => ({
      items,
      pagination,
      totalCount: pagination?.totalItems ?? items.length,
      hasNextPage: pagination?.hasNext ?? false,
      isLoading,
      errorMessage,
      refetch,
    }),
    [items, pagination, isLoading, errorMessage, refetch],
  );
}
