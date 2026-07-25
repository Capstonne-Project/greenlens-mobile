import { ReportDetailView } from '@/components/report/ReportDetailView';
import { useReportDetail } from '@/hooks/useReportDetail';
import { useResolvedMergedFromId } from '@/hooks/useResolvedMergedFromId';
import { useAuthStore } from '@/stores/auth.store';
import type { ReportDetailSource } from '@/types/report-detail.types';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback } from 'react';

export default function ReportDetailScreen() {
  const { id, source, fromMergedReportId } = useLocalSearchParams<{
    id: string;
    source?: ReportDetailSource;
    fromMergedReportId?: string;
  }>();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const detailSource: ReportDetailSource = source === 'map' ? 'map' : 'tab';
  const explicitMergedFrom =
    typeof fromMergedReportId === 'string' && fromMergedReportId.length > 0
      ? fromMergedReportId
      : null;

  const { detail, history, isLoading, isActionBusy, errorMessage, refetch, closeReport, reopenReport, rateReport } =
    useReportDetail(id, Boolean(id));

  const shouldResolveMergedFrom =
    detailSource === 'tab' &&
    !explicitMergedFrom &&
    !!detail &&
    detail.status !== 'Duplicate' &&
    ((detail.reporterCount ?? 0) > 1 || (detail.mergedReports?.length ?? 0) > 0);

  const resolvedMergedFromId = useResolvedMergedFromId(
    id,
    explicitMergedFrom,
    shouldResolveMergedFrom,
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(detailSource === 'map' ? '/(tabs)' : '/(tabs)/reports');
  }, [detailSource]);

  const openReportById = useCallback(
    (reportId: string, nextFromMergedId?: string | null) => {
      router.push({
        pathname: '/report/[id]',
        params: {
          id: reportId,
          source: detailSource,
          ...(nextFromMergedId ? { fromMergedReportId: nextFromMergedId } : {}),
        },
      } as Href);
    },
    [detailSource],
  );

  return (
    <ReportDetailView
      detail={detail}
      history={history}
      isLoading={isLoading}
      isActionBusy={isActionBusy}
      errorMessage={errorMessage}
      source={detailSource}
      currentUserId={currentUserId}
      fromMergedReportId={resolvedMergedFromId}
      onBack={handleBack}
      onRetry={() => void refetch()}
      onOpenPrimaryReport={(primaryReportId) => {
        openReportById(primaryReportId, id);
      }}
      onOpenMergedReport={(reportId) => {
        openReportById(reportId);
      }}
      onClose={async () => {
        await closeReport();
      }}
      onReopen={async () => {
        await reopenReport();
      }}
      onRate={async (dto) => {
        await rateReport(dto);
      }}
    />
  );
}
