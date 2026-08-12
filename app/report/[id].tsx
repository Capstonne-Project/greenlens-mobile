import { ReportDetailView } from '@/components/report/ReportDetailView';
import { useReportDetail } from '@/hooks/useReportDetail';
import { useResolvedMergedFromId } from '@/hooks/useResolvedMergedFromId';
import { useAuthStore } from '@/stores/auth.store';
import type { ReportDetailSource } from '@/types/report-detail.types';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback } from 'react';

export default function ReportDetailScreen() {
  const { id, source, fromMergedReportId, fromMergedReportImageUrl, seedImageUrl } =
    useLocalSearchParams<{
      id: string;
      source?: ReportDetailSource;
      fromMergedReportId?: string;
      fromMergedReportImageUrl?: string;
      seedImageUrl?: string;
    }>();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const detailSource: ReportDetailSource = source === 'map' ? 'map' : 'tab';
  const explicitMergedFrom =
    typeof fromMergedReportId === 'string' && fromMergedReportId.length > 0
      ? fromMergedReportId
      : null;
  const mergedFromThumb =
    typeof fromMergedReportImageUrl === 'string' && fromMergedReportImageUrl.trim().length > 0
      ? fromMergedReportImageUrl.trim()
      : null;
  const heroSeedThumb =
    typeof seedImageUrl === 'string' && seedImageUrl.trim().length > 0
      ? seedImageUrl.trim()
      : mergedFromThumb;

  const { detail, history, isLoading, isActionBusy, errorMessage, refetch, closeReport, requestReopen, rateReport } =
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
    (
      reportId: string,
      options?: {
        fromMergedReportId?: string | null;
        seedImageUrl?: string | null;
        fromMergedReportImageUrl?: string | null;
      },
    ) => {
      const seed = options?.seedImageUrl?.trim();
      const fromThumb = options?.fromMergedReportImageUrl?.trim();
      router.push({
        pathname: '/report/[id]',
        params: {
          id: reportId,
          source: detailSource,
          ...(options?.fromMergedReportId
            ? { fromMergedReportId: options.fromMergedReportId }
            : {}),
          ...(fromThumb ? { fromMergedReportImageUrl: fromThumb } : {}),
          ...(seed ? { seedImageUrl: seed } : {}),
        },
      } as Href);
    },
    [detailSource],
  );

  const openUserProfile = useCallback(
    (userId: string) => {
      // Bấm vào chính mình → về tab hồ sơ của mình, không mở màn hồ sơ người khác.
      if (userId === currentUserId) {
        router.push('/(tabs)/profile');
        return;
      }
      router.push({ pathname: '/user/[id]', params: { id: userId } } as Href);
    },
    [currentUserId],
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
      fromMergedReportImageUrl={mergedFromThumb}
      seedImageUrl={heroSeedThumb}
      onBack={handleBack}
      onRetry={() => void refetch()}
      onOpenPrimaryReport={(primaryReportId) => {
        openReportById(primaryReportId, {
          fromMergedReportId: id,
          // Giữ thumb báo cáo hiện tại (Duplicate) khi nhảy sang primary
          fromMergedReportImageUrl: heroSeedThumb ?? detail?.imageUrl,
        });
      }}
      onOpenMergedReport={(reportId, imageUrl) => {
        openReportById(reportId, { seedImageUrl: imageUrl });
      }}
      onOpenUserProfile={openUserProfile}
      onViewInMyReports={
        detailSource === 'map' && detail
          ? () =>
              router.push({
                pathname: '/(tabs)/reports',
                params: { highlightReportId: detail.id },
              } as Href)
          : undefined
      }
      onClose={async () => {
        await closeReport();
      }}
      onRequestReopen={requestReopen}
      onRate={async (dto) => {
        await rateReport(dto);
      }}
    />
  );
}
