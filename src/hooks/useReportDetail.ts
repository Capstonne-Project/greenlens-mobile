import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { reportDetailService } from '@/services/reportDetail.service';
import type {
  RateReportDto,
  ReportAssignmentItem,
  ReportDetail,
  ReportDetailWasteTag,
  ReportHistoryItem,
  ReportMediaItem,
} from '@/types/report-detail.types';
import { getApiErrorMessage } from '@/utils/api-error-message';

interface UseReportDetailResult {
  detail: ReportDetail | null;
  history: ReportHistoryItem[];
  isLoading: boolean;
  isActionBusy: boolean;
  errorMessage: string | null;
  refetch: () => Promise<void>;
  closeReport: () => Promise<boolean>;
  reopenReport: () => Promise<boolean>;
  rateReport: (dto: RateReportDto) => Promise<boolean>;
}

function normalizeWasteTags(raw: ReportDetailWasteTag[] | undefined): ReportDetailWasteTag[] {
  return (raw ?? []).map((tag, index) => {
    const id = String(tag.id || tag.tagId || tag.code || `waste-tag-${index}`);
    return {
      id,
      tagId: tag.tagId,
      code: tag.code,
      nameVi: tag.nameVi || 'Loại rác',
    };
  });
}

function normalizeAssignments(raw: ReportAssignmentItem[] | undefined): ReportAssignmentItem[] {
  return (raw ?? []).map((item, index) => ({
    ...item,
    id: item.id || item.teamId || `assignment-${index}`,
    teamName: item.teamName || 'Đội xử lý',
    progressPercent: item.progressPercent ?? 0,
  }));
}

function normalizeMedia(raw: ReportMediaItem[] | undefined): ReportMediaItem[] {
  return (raw ?? []).map((item, index) => ({
    ...item,
    id: item.id || `media-${index}`,
  }));
}

export function useReportDetail(reportId: string | undefined, enabled = true): UseReportDetailResult {
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    if (!reportId) return;

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [detailRes, historyRes] = await Promise.all([
        reportDetailService.getById(reportId),
        reportDetailService.getHistory(reportId),
      ]);

      if (requestId !== requestIdRef.current) return;

      const data = detailRes.data.data;
      setDetail({
        ...data,
        media: normalizeMedia(data.media),
        assignments: normalizeAssignments(data.assignments),
        wasteTags: normalizeWasteTags(data.wasteTags),
        reopenedCount: data.reopenedCount ?? 0,
      });
      setHistory(historyRes.data.data.items ?? []);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setDetail(null);
      setHistory([]);
      setErrorMessage(getApiErrorMessage(error, 'Không tải được chi tiết báo cáo.'));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [reportId]);

  useEffect(() => {
    if (!enabled || !reportId) return;
    void refetch();
  }, [enabled, reportId, refetch]);

  const closeReport = useCallback(async () => {
    if (!reportId) return false;
    setIsActionBusy(true);
    try {
      await reportDetailService.close(reportId);
      await refetch();
      return true;
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể đóng báo cáo.'));
      return false;
    } finally {
      setIsActionBusy(false);
    }
  }, [refetch, reportId]);

  const reopenReport = useCallback(async () => {
    if (!reportId) return false;
    setIsActionBusy(true);
    try {
      await reportDetailService.reopen(reportId);
      await refetch();
      return true;
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không thể mở lại báo cáo.'));
      return false;
    } finally {
      setIsActionBusy(false);
    }
  }, [refetch, reportId]);

  const rateReport = useCallback(
    async (dto: RateReportDto) => {
      if (!reportId) return false;
      setIsActionBusy(true);
      try {
        await reportDetailService.rate(reportId, dto);
        await refetch();
        return true;
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, 'Không thể gửi đánh giá.'));
        return false;
      } finally {
        setIsActionBusy(false);
      }
    },
    [refetch, reportId],
  );

  return useMemo(
    () => ({
      detail,
      history,
      isLoading,
      isActionBusy,
      errorMessage,
      refetch,
      closeReport,
      reopenReport,
      rateReport,
    }),
    [detail, history, isLoading, isActionBusy, errorMessage, refetch, closeReport, reopenReport, rateReport],
  );
}
