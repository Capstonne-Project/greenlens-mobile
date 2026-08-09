import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { myReportsService } from '@/services/myReports.service';
import type {
  MyReportItem,
  MyReportsFilterKey,
  ReportsPagination,
} from '@/types/my-reports.types';
import { filterMyReportsByKey, myReportsFilterToApiStatus } from '@/types/my-reports.types';

interface UseMyReportsParams {
  filterKey?: MyReportsFilterKey;
  pageSize?: number;
  enabled?: boolean;
}

interface UseMyReportsResult {
  items: MyReportItem[];
  totalCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isFetchingMore: boolean;
  hasNextPage: boolean;
  errorMessage: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

type FetchMode = 'initial' | 'refresh' | 'more';

const CLIENT_FILTER_KEYS: MyReportsFilterKey[] = ['InProgress', 'NEEDS_CONFIRM', 'REOPENED', 'DONE'];

export function useMyReports({
  filterKey = 'ALL',
  pageSize = 20,
  enabled = true,
}: UseMyReportsParams = {}): UseMyReportsResult {
  const [rawItems, setRawItems] = useState<MyReportItem[]>([]);
  const [pagination, setPagination] = useState<ReportsPagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const apiStatus = myReportsFilterToApiStatus(filterKey);
  const usesClientFilter = CLIENT_FILTER_KEYS.includes(filterKey);

  const fetchPage = useCallback(
    async (page: number, mode: FetchMode) => {
      const requestId = ++requestIdRef.current;
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      if (mode === 'more') setIsFetchingMore(true);
      if (mode !== 'more') setErrorMessage(null);

      try {
        const response = await myReportsService.getMyReports({
          page,
          pageSize: usesClientFilter ? 100 : pageSize,
          status: usesClientFilter ? undefined : apiStatus,
        });
        if (requestId !== requestIdRef.current) return;

        const payload = response.data.data;
        setPagination(payload.pagination);
        setRawItems((prev) => (mode === 'more' ? [...prev, ...payload.items] : payload.items));
      } catch {
        if (requestId !== requestIdRef.current) return;
        if (mode !== 'more') {
          setRawItems([]);
          setPagination(null);
        }
        setErrorMessage('Không tải được báo cáo. Vui lòng thử lại.');
      } finally {
        if (requestId !== requestIdRef.current) return;
        if (mode === 'initial') setIsLoading(false);
        if (mode === 'refresh') setIsRefreshing(false);
        if (mode === 'more') setIsFetchingMore(false);
      }
    },
    [apiStatus, pageSize, usesClientFilter],
  );

  useEffect(() => {
    if (!enabled) return;
    void fetchPage(1, 'initial');
  }, [enabled, fetchPage]);

  const refetch = useCallback(async () => {
    await fetchPage(1, 'refresh');
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (usesClientFilter || isLoading || isRefreshing || isFetchingMore || !pagination?.hasNext) return;
    await fetchPage(pagination.page + 1, 'more');
  }, [fetchPage, isFetchingMore, isLoading, isRefreshing, pagination, usesClientFilter]);

  const items = useMemo(
    () => (usesClientFilter ? filterMyReportsByKey(rawItems, filterKey) : rawItems),
    [filterKey, rawItems, usesClientFilter],
  );

  return useMemo(
    () => ({
      items,
      totalCount: usesClientFilter ? items.length : (pagination?.totalItems ?? 0),
      isLoading,
      isRefreshing,
      isFetchingMore,
      hasNextPage: usesClientFilter ? false : (pagination?.hasNext ?? false),
      errorMessage,
      refetch,
      loadMore,
    }),
    [items, usesClientFilter, pagination, isLoading, isRefreshing, isFetchingMore, errorMessage, refetch, loadMore],
  );
}
