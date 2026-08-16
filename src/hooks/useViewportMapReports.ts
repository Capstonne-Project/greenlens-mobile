import type { CategoryFilterId } from '@/components/map/CategoryFilterChips';
import { HCM_INITIAL_REGION } from '@/constants/map-region';
import type { CitizenMapPin } from '@/data/citizen-map-mock';
import { mapReportsService } from '@/services/mapReports.service';
import { mapSummaryService } from '@/services/mapSummary.service';
import type { ApiEnvelope } from '@/types/api.types';
import type { MapViewportSummaryData } from '@/types/map-summary.types';
import type { MapViewportRegion, ViewportBBox } from '@/types/map-viewport.types';
import type { PublicMapReportDto } from '@/types/public-map.types';
import { regionToBBox } from '@/utils/map-viewport';
import {
  buildViewportSummaryFallback,
  normalizeMapSummaryPayload,
} from '@/utils/map-summary.utils';
import { publicMapDtoToCitizenPin } from '@/utils/public-map-mapper';
import { isAxiosError, isCancel } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Region } from 'react-native-maps';

const DEBOUNCE_MS = 520;
const DEFAULT_DETAIL_LIMIT = 200;
const DEFAULT_SUMMARY_DAYS = 30;
const BBOX_DECIMALS = 4;
/** BR: bị 429 thì lùi dần thời gian chờ trước khi cho fetch lại, tránh spam thêm request khi đang bị rate-limit. */
const RATE_LIMIT_BACKOFF_MS = [3000, 6000, 15000, 30000];
const RATE_LIMIT_MAX_BACKOFF_MS = RATE_LIMIT_BACKOFF_MS[RATE_LIMIT_BACKOFF_MS.length - 1];

function roundBBox(b: ViewportBBox): ViewportBBox {
  const r = (n: number) =>
    Math.round(n * Math.pow(10, BBOX_DECIMALS)) / Math.pow(10, BBOX_DECIMALS);
  return {
    minLat: r(b.minLat),
    maxLat: r(b.maxLat),
    minLng: r(b.minLng),
    maxLng: r(b.maxLng),
  };
}

function bboxCacheKey(b: ViewportBBox, categoryId?: string): string {
  const x = roundBBox(b);
  return `${x.minLat},${x.maxLat},${x.minLng},${x.maxLng}|${categoryId ?? 'all'}`;
}

function initialRegionLike(): MapViewportRegion {
  return {
    latitude: HCM_INITIAL_REGION.latitude,
    longitude: HCM_INITIAL_REGION.longitude,
    latitudeDelta: HCM_INITIAL_REGION.latitudeDelta,
    longitudeDelta: HCM_INITIAL_REGION.longitudeDelta,
  };
}

function getApiErrorCode(error: unknown): string | null {
  if (!isAxiosError(error)) return null;
  const body = error.response?.data as ApiEnvelope<unknown> | undefined;
  return body?.code ?? null;
}

function isRateLimitError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 429;
}

function resolveViewportSummary(
  summaryResult: PromiseSettledResult<Awaited<ReturnType<typeof mapSummaryService.getViewportSummary>>>,
  reportItems: PublicMapReportDto[],
  days: number,
): MapViewportSummaryData {
  if (summaryResult.status === 'fulfilled') {
    const normalized = normalizeMapSummaryPayload(summaryResult.value.data.data);
    if (normalized && normalized.dailyCounts.length > 0) {
      return normalized;
    }
    if (__DEV__) {
      console.warn('[MapSummary] API thiếu dailyCounts — dùng fallback từ map/reports');
    }
  }
  return buildViewportSummaryFallback(reportItems, days);
}

export interface UseViewportMapReportsOptions {
  summaryDays?: number;
  onCategoryNotFound?: () => void;
}

export interface UseViewportMapReportsResult {
  pins: CitizenMapPin[];
  summary: MapViewportSummaryData | null;
  isLoading: boolean;
  isSummaryLoading: boolean;
  errorMessage: string | null;
  onRegionChangeComplete: (region: Region) => void;
}

export function useViewportMapReports(
  filter: CategoryFilterId,
  options: UseViewportMapReportsOptions = {},
): UseViewportMapReportsResult {
  const summaryDays = options.summaryDays ?? DEFAULT_SUMMARY_DAYS;
  const onCategoryNotFound = options.onCategoryNotFound;

  const [pins, setPins] = useState<CitizenMapPin[]>([]);
  const [summary, setSummary] = useState<MapViewportSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastKeyRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastBBoxRef = useRef<ViewportBBox | null>(null);
  const lastSummaryRef = useRef<MapViewportSummaryData | null>(null);
  const rateLimitUntilRef = useRef<number>(0);
  const rateLimitStreakRef = useRef<number>(0);
  const pendingRequestRef = useRef<{ bbox: ViewportBBox; catId?: string } | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoryId = filter === 'all' ? undefined : filter;

  const fetchForBBox = useCallback(
    async (bbox: ViewportBBox, catId?: string) => {
      const key = bboxCacheKey(bbox, catId);
      if (key === lastKeyRef.current) return;

      const now = Date.now();
      if (now < rateLimitUntilRef.current) {
        // Đang trong thời gian chờ do bị rate-limit — hoãn fetch, không bắn thêm request.
        pendingRequestRef.current = { bbox, catId };
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      lastKeyRef.current = key;
      setIsLoading(true);
      setIsSummaryLoading(true);
      setErrorMessage(null);

      try {
        if (__DEV__) {
          console.log('[MapViewport] fetch bbox:', bbox, 'categoryId:', catId);
        }

        const [reportsResult, summaryResult] = await Promise.allSettled([
          mapReportsService.getPublicInViewport(
            {
              ...bbox,
              mode: 'detail',
              limit: DEFAULT_DETAIL_LIMIT,
              categoryId: catId,
            },
            { signal: ac.signal },
          ),
          mapSummaryService.getViewportSummary(
            {
              ...bbox,
              days: summaryDays,
              categoryId: catId,
            },
            { signal: ac.signal },
          ),
        ]);

        if (ac.signal.aborted) {
          lastKeyRef.current = null;
          return;
        }

        let reportItems: PublicMapReportDto[] = [];

        if (reportsResult.status === 'fulfilled') {
          rateLimitStreakRef.current = 0;
          reportItems = reportsResult.value.data.data?.items ?? [];
          if (__DEV__) {
            console.log('[MapReports] returned:', reportItems.length, 'items');
          }
          setPins(reportItems.map(publicMapDtoToCitizenPin));
        } else {
          const reportsError = reportsResult.reason;
          if (isCancel(reportsError)) {
            lastKeyRef.current = null;
            return;
          }
          lastKeyRef.current = null;

          if (isRateLimitError(reportsError)) {
            const streak = Math.min(rateLimitStreakRef.current, RATE_LIMIT_BACKOFF_MS.length - 1);
            const waitMs = RATE_LIMIT_BACKOFF_MS[streak] ?? RATE_LIMIT_MAX_BACKOFF_MS;
            rateLimitStreakRef.current += 1;
            rateLimitUntilRef.current = Date.now() + waitMs;
            pendingRequestRef.current = { bbox, catId };
            setErrorMessage(`Quá nhiều yêu cầu, đang thử lại sau ${Math.round(waitMs / 1000)}s…`);
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            retryTimerRef.current = setTimeout(() => {
              retryTimerRef.current = null;
              const pending = pendingRequestRef.current;
              pendingRequestRef.current = null;
              if (pending) void fetchForBBox(pending.bbox, pending.catId);
            }, waitMs);
            setPins([]);
            return;
          }

          rateLimitStreakRef.current = 0;
          const reportsCode = getApiErrorCode(reportsError);
          if (reportsCode === 'CATEGORY_NOT_FOUND') {
            onCategoryNotFound?.();
          }
          const msg = isAxiosError(reportsError)
            ? (reportsError.response?.data as { message?: string } | undefined)?.message ?? reportsError.message
            : 'Không tải được báo cáo trên bản đồ.';
          setErrorMessage(typeof msg === 'string' ? msg : 'Lỗi mạng');
          setPins([]);
        }

        if (summaryResult.status === 'fulfilled') {
          const payload = resolveViewportSummary(summaryResult, reportItems, summaryDays);
          lastSummaryRef.current = payload;
          setSummary(payload);
          if (__DEV__) {
            console.log('[MapSummary] reportCount:', payload.reportCount, 'days:', payload.dailyCounts.length);
          }
        } else {
          const summaryError = summaryResult.reason;
          if (!isCancel(summaryError)) {
            const summaryCode = getApiErrorCode(summaryError);
            if (summaryCode === 'CATEGORY_NOT_FOUND') {
              onCategoryNotFound?.();
            }
            if (__DEV__) {
              console.warn('[MapSummary] API lỗi — fallback từ map/reports:', getApiErrorCode(summaryError));
            }
            const fallback = resolveViewportSummary(summaryResult, reportItems, summaryDays);
            lastSummaryRef.current = fallback;
            setSummary(fallback);
          }
        }
      } finally {
        if (!ac.signal.aborted) {
          setIsLoading(false);
          setIsSummaryLoading(false);
        }
      }
    },
    [onCategoryNotFound, summaryDays],
  );

  const scheduleFetch = useCallback(
    (bbox: ViewportBBox, catId?: string) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        void fetchForBBox(bbox, catId);
      }, DEBOUNCE_MS);
    },
    [fetchForBBox],
  );

  const onRegionChangeComplete = useCallback(
    (region: Region) => {
      const bbox = regionToBBox(region);
      lastBBoxRef.current = bbox;
      scheduleFetch(bbox, categoryId);
    },
    [categoryId, scheduleFetch],
  );

  useEffect(() => {
    const bbox = lastBBoxRef.current ?? regionToBBox(initialRegionLike());
    lastKeyRef.current = null;
    void fetchForBBox(bbox, categoryId);
  }, [categoryId, fetchForBBox]);

  useEffect(() => {
    const bbox = regionToBBox(initialRegionLike());
    lastBBoxRef.current = bbox;
    void fetchForBBox(bbox, categoryId);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    pins,
    summary,
    isLoading,
    isSummaryLoading,
    errorMessage,
    onRegionChangeComplete,
  };
}
