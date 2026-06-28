import { ReportDetailView } from '@/components/report/ReportDetailView';
import { useReportDetail } from '@/hooks/useReportDetail';
import { useAuthStore } from '@/stores/auth.store';
import type { ReportDetailSource } from '@/types/report-detail.types';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

export default function ReportDetailScreen() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: ReportDetailSource }>();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const detailSource: ReportDetailSource = source === 'map' ? 'map' : 'tab';

  const { detail, history, isLoading, isActionBusy, errorMessage, refetch, closeReport, reopenReport } =
    useReportDetail(id, Boolean(id));

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(detailSource === 'map' ? '/(tabs)' : '/(tabs)/reports');
  }, [detailSource]);

  return (
    <ReportDetailView
      detail={detail}
      history={history}
      isLoading={isLoading}
      isActionBusy={isActionBusy}
      errorMessage={errorMessage}
      source={detailSource}
      currentUserId={currentUserId}
      onBack={handleBack}
      onRetry={() => void refetch()}
      onClose={async () => {
        await closeReport();
      }}
      onReopen={async () => {
        await reopenReport();
      }}
    />
  );
}
