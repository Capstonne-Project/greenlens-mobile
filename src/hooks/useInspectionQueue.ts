import { useCallback, useEffect, useMemo, useState } from 'react';

import { inspectionService } from '@/services/inspection.service';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiPagination } from '@/types/api.types';
import type { InspectionQueueItem } from '@/types/inspection.types';

interface UseInspectionQueueParams {
  status?: string;
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Gate theo `user.role`: tab bar giữ màn Inspector mounted ở background
 * (react-navigation không unmount tab ẩn) — nếu không gate, sau khi user
 * logout khỏi Inspector và login lại bằng role khác, hook này vẫn tiếp tục
 * gọi `/inspections/queue` bằng token mới → BE trả 403 vì sai role.
 */
export function useInspectionQueue({
  status,
  pageSize = 20,
  enabled = true,
}: UseInspectionQueueParams = {}) {
  const role = useAuthStore((s) => s.user?.role);
  const isInspector = role === 'Inspector';

  const [items, setItems] = useState<InspectionQueueItem[]>([]);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!isInspector) return;
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
  }, [status, pageSize, isInspector]);

  useEffect(() => {
    if (!enabled || !isInspector) {
      if (!isInspector) {
        setItems([]);
        setPagination(null);
      }
      return;
    }
    void refetch();
  }, [enabled, isInspector, refetch]);

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
