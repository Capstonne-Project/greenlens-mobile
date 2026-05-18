import type { CategoryFilterId } from '@/components/map/CategoryFilterChips';
import { HCM_INITIAL_REGION } from '@/constants/map-region';
import type { CitizenMapPin } from '@/data/citizen-map-mock';
import { mapReportsService } from '@/services/mapReports.service';
import type { MapViewportRegion, ViewportBBox } from '@/types/map-viewport.types';
import { regionToBBox } from '@/utils/map-viewport';
import { publicMapDtoToCitizenPin } from '@/utils/public-map-mapper';
import { isAxiosError, isCancel } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Region } from 'react-native-maps';

const DEBOUNCE_MS = 520;
const DEFAULT_DETAIL_LIMIT = 200;
const BBOX_DECIMALS = 4;

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

export interface UseViewportMapReportsResult {
  pins: CitizenMapPin[];
  rawCount: number;
  isLoading: boolean;
  errorMessage: string | null;
  onRegionChangeComplete: (region: Region) => void;
}

export function useViewportMapReports(filter: CategoryFilterId): UseViewportMapReportsResult {
  const [pins, setPins] = useState<CitizenMapPin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastKeyRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastBBoxRef = useRef<ViewportBBox | null>(null);

  // categoryId là UUID khi chọn category cụ thể, undefined khi 'all'
  const categoryId = filter === 'all' ? undefined : filter;

  const fetchForBBox = useCallback(async (bbox: ViewportBBox, catId?: string) => {
    const key = bboxCacheKey(bbox, catId);
    if (key === lastKeyRef.current) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    lastKeyRef.current = key;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (__DEV__) {
        console.log('[MapReports] fetch bbox:', bbox, 'categoryId:', catId);
      }
      const res = await mapReportsService.getPublicInViewport(
        {
          ...bbox,
          mode: 'detail',
          limit: DEFAULT_DETAIL_LIMIT,
          categoryId: catId,
        },
        { signal: ac.signal },
      );

      const payload = res.data.data;
      const items = payload?.items ?? [];
      if (__DEV__) {
        console.log('[MapReports] returned:', items.length, 'items');
      }
      setPins(items.map(publicMapDtoToCitizenPin));
    } catch (e: unknown) {
      if (isCancel(e)) {
        lastKeyRef.current = null;
        return;
      }
      const msg = isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message ?? e.message
        : 'Không tải được báo cáo trên bản đồ.';
      setErrorMessage(typeof msg === 'string' ? msg : 'Lỗi mạng');
      lastKeyRef.current = null;
      setPins([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Khi filter thay đổi → refetch ngay với bbox hiện tại (không cần user kéo map)
  useEffect(() => {
    const bbox = lastBBoxRef.current ?? regionToBBox(initialRegionLike());
    lastKeyRef.current = null; // force refetch dù bbox không đổi
    void fetchForBBox(bbox, categoryId);
  }, [categoryId, fetchForBBox]);

  // Fetch lần đầu khi mount
  useEffect(() => {
    const bbox = regionToBBox(initialRegionLike());
    lastBBoxRef.current = bbox;
    void fetchForBBox(bbox, categoryId);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      abortRef.current?.abort();
    };
    // chỉ chạy 1 lần khi mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    pins,
    rawCount: pins.length,
    isLoading,
    errorMessage,
    onRegionChangeComplete,
  };
}
