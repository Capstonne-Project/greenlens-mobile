import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { reportDetailService } from '@/services/reportDetail.service';
import type { MergedReportRef } from '@/types/report-detail.types';
import { toMergedReportRef } from '@/utils/report-merge';

interface UseReportsByIdsResult {
  itemsById: Record<string, MergedReportRef>;
  isLoading: boolean;
  errorMessage: string | null;
  refetch: () => Promise<void>;
}

/**
 * Flexible fetch: truyền bất kỳ list id nào từ response → get `/reports/{id}` song song.
 * Dùng cho section báo cáo đã gộp / deep-link partial payload.
 */
export function useReportsByIds(ids: string[], enabled = true): UseReportsByIdsResult {
  const [itemsById, setItemsById] = useState<Record<string, MergedReportRef>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const stableKey = useMemo(
    () =>
      [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
        .sort()
        .join('|'),
    [ids],
  );

  const resolvedIds = useMemo(
    () => (stableKey ? stableKey.split('|') : []),
    [stableKey],
  );

  const refetch = useCallback(async () => {
    if (!enabled || resolvedIds.length === 0) {
      setItemsById({});
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const results = await Promise.allSettled(
        resolvedIds.map(async (id) => {
          const res = await reportDetailService.getById(id);
          return toMergedReportRef(res.data.data);
        }),
      );

      if (requestId !== requestIdRef.current) return;

      const next: Record<string, MergedReportRef> = {};
      let failCount = 0;

      results.forEach((result, index) => {
        const id = resolvedIds[index];
        if (result.status === 'fulfilled') {
          next[id] = result.value;
        } else {
          failCount += 1;
        }
      });

      setItemsById(next);
      if (failCount > 0 && Object.keys(next).length === 0) {
        setErrorMessage('Không tải được báo cáo liên quan.');
      }
    } catch {
      if (requestId !== requestIdRef.current) return;
      setItemsById({});
      setErrorMessage('Không tải được báo cáo liên quan.');
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, resolvedIds]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return useMemo(
    () => ({ itemsById, isLoading, errorMessage, refetch }),
    [itemsById, isLoading, errorMessage, refetch],
  );
}
