import { useEffect, useState } from 'react';

import { myReportsService } from '@/services/myReports.service';
import { isUuid } from '@/utils/report-merge';

/**
 * Khi mở primary từ notification (chỉ có referenceId), tìm report Duplicate của user
 * đã gộp vào primary đó để hydrate section "Báo cáo đã gộp".
 */
export function useResolvedMergedFromId(
  primaryReportId: string | undefined,
  explicitFromMergedReportId?: string | null,
  enabled = true,
): string | null {
  const [resolvedId, setResolvedId] = useState<string | null>(
    isUuid(explicitFromMergedReportId) ? explicitFromMergedReportId.trim() : null,
  );

  useEffect(() => {
    if (isUuid(explicitFromMergedReportId)) {
      setResolvedId(explicitFromMergedReportId.trim());
      return;
    }

    if (!enabled || !isUuid(primaryReportId)) {
      setResolvedId(null);
      return;
    }

    let cancelled = false;
    const primaryId = primaryReportId.trim();

    void (async () => {
      try {
        const res = await myReportsService.getMyReports({ page: 1, pageSize: 50 });
        if (cancelled) return;
        const match = (res.data.data.items ?? []).find(
          (item) =>
            item.status === 'Duplicate' &&
            isUuid(item.mergedIntoPrimaryReportId) &&
            item.mergedIntoPrimaryReportId.trim() === primaryId,
        );
        setResolvedId(match?.id ?? null);
      } catch {
        if (!cancelled) setResolvedId(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, explicitFromMergedReportId, primaryReportId]);

  return resolvedId;
}
