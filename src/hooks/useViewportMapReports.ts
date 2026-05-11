import type { CategoryFilterId } from '@/components/map/CategoryFilterChips';
import { HCM_INITIAL_REGION } from '@/constants/map-region';
import type { CitizenMapPin } from '@/data/citizen-map-mock';
import { mapReportsService } from '@/services/mapReports.service';
import type { MapViewportRegion, ViewportBBox } from '@/types/map-viewport.types';
import { regionToBBox } from '@/utils/map-viewport';
import { publicMapDtoToCitizenPin } from '@/utils/public-map-mapper';
import { isAxiosError, isCancel } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function bboxCacheKey(b: ViewportBBox): string {
  const x = roundBBox(b);
  return `${x.minLat},${x.maxLat},${x.minLng},${x.maxLng}`;
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
  /** Gọi từ `MapView` `onRegionChangeComplete` sau khi user kéo/zoom xong */
  onRegionChangeComplete: (region: Region) => void;
}

/**
 * Luồng viewport — docs/PUBLIC_MAP_VIEWPORT_PLAN.md §4:
 * bbox từ `react-native-maps` → debounce → GET mode=detail.
 */
export function useViewportMapReports(filter: CategoryFilterId): UseViewportMapReportsResult {
  const [rawPins, setRawPins] = useState<CitizenMapPin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastKeyRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pins = useMemo(() => {
    if (filter === 'all') return rawPins;
    return rawPins.filter((p) => p.category === filter);
  }, [filter, rawPins]);

  const fetchForBBox = useCallback(async (bbox: ViewportBBox) => {
    const key = bboxCacheKey(bbox);
    if (key === lastKeyRef.current) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await mapReportsService.getPublicInViewport(
        {
          ...bbox,
          mode: 'detail',
          limit: DEFAULT_DETAIL_LIMIT,
        },
        { signal: ac.signal }
      );

      const payload = res.data.data;
      const items = payload?.items ?? [];
      setRawPins(items.map(publicMapDtoToCitizenPin));
      lastKeyRef.current = key;
    } catch (e: unknown) {
      if (isCancel(e)) return;
      const msg = isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message ?? e.message
        : 'Không tải được báo cáo trên bản đồ.';
      setErrorMessage(typeof msg === 'string' ? msg : 'Lỗi mạng');
      setRawPins([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const scheduleFetch = useCallback(
    (bbox: ViewportBBox) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        void fetchForBBox(bbox);
      }, DEBOUNCE_MS);
    },
    [fetchForBBox]
  );

  const onRegionChangeComplete = useCallback(
    (region: Region) => {
      scheduleFetch(regionToBBox(region));
    },
    [scheduleFetch]
  );

  useEffect(() => {
    void fetchForBBox(regionToBBox(initialRegionLike()));
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      abortRef.current?.abort();
    };
  }, [fetchForBBox]);

  return {
    pins,
    rawCount: rawPins.length,
    isLoading,
    errorMessage,
    onRegionChangeComplete,
  };
}
