import { useCallback, useEffect, useMemo, useState } from 'react';
import { catalogService } from '@/services/catalog.service';
import type { CatalogProvince, CatalogWard } from '@/types/catalog.types';
import { extractPolygonRings } from '@/utils/geojson-boundaries';
import type { LatLng } from 'react-native-maps';

interface UseCatalogAddressResult {
  provinces: CatalogProvince[];
  wards: CatalogWard[];
  isLoadingProvinces: boolean;
  isLoadingWards: boolean;
  errorMessage: string | null;
  provincePolygons: LatLng[][];
  wardPolygons: LatLng[][];
  loadProvinceBoundary: (boundaryUrl: string | null) => Promise<void>;
  loadWardBoundary: (boundaryUrl: string | null) => Promise<void>;
  refetchProvinces: () => Promise<void>;
  refetchWards: (provinceCode: string) => Promise<void>;
}

const geoJsonCache = new Map<string, LatLng[][]>();

async function fetchBoundaryPolygons(boundaryUrl: string): Promise<LatLng[][]> {
  const cached = geoJsonCache.get(boundaryUrl);
  if (cached) {
    return cached;
  }

  const response = await fetch(boundaryUrl);
  if (!response.ok) {
    throw new Error('BOUNDARY_FETCH_FAILED');
  }

  const geoJson = (await response.json()) as Parameters<typeof extractPolygonRings>[0];
  const polygons = extractPolygonRings(geoJson);
  geoJsonCache.set(boundaryUrl, polygons);
  return polygons;
}

export function useCatalogAddress(): UseCatalogAddressResult {
  const [provinces, setProvinces] = useState<CatalogProvince[]>([]);
  const [wards, setWards] = useState<CatalogWard[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(true);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [provincePolygons, setProvincePolygons] = useState<LatLng[][]>([]);
  const [wardPolygons, setWardPolygons] = useState<LatLng[][]>([]);

  const refetchProvinces = useCallback(async () => {
    setIsLoadingProvinces(true);
    setErrorMessage(null);
    try {
      const response = await catalogService.getProvinces();
      setProvinces(response.data.data.items);
    } catch {
      setErrorMessage('Không tải được danh sách tỉnh. Vui lòng thử lại.');
    } finally {
      setIsLoadingProvinces(false);
    }
  }, []);

  const refetchWards = useCallback(async (provinceCode: string) => {
    setIsLoadingWards(true);
    setErrorMessage(null);
    try {
      const response = await catalogService.getWardsByProvince(provinceCode);
      setWards(response.data.data.items);
    } catch {
      setErrorMessage('Không tải được danh sách phường. Vui lòng thử lại.');
    } finally {
      setIsLoadingWards(false);
    }
  }, []);

  const loadProvinceBoundary = useCallback(async (boundaryUrl: string | null) => {
    if (!boundaryUrl) {
      setProvincePolygons([]);
      return;
    }

    try {
      const polygons = await fetchBoundaryPolygons(boundaryUrl);
      setProvincePolygons(polygons);
    } catch {
      setProvincePolygons([]);
    }
  }, []);

  const loadWardBoundary = useCallback(async (boundaryUrl: string | null) => {
    if (!boundaryUrl) {
      setWardPolygons([]);
      return;
    }

    try {
      const polygons = await fetchBoundaryPolygons(boundaryUrl);
      setWardPolygons(polygons);
    } catch {
      setWardPolygons([]);
    }
  }, []);

  useEffect(() => {
    void refetchProvinces();
  }, [refetchProvinces]);

  return useMemo(
    () => ({
      provinces,
      wards,
      isLoadingProvinces,
      isLoadingWards,
      errorMessage,
      provincePolygons,
      wardPolygons,
      loadProvinceBoundary,
      loadWardBoundary,
      refetchProvinces,
      refetchWards,
    }),
    [
      provinces,
      wards,
      isLoadingProvinces,
      isLoadingWards,
      errorMessage,
      provincePolygons,
      wardPolygons,
      loadProvinceBoundary,
      loadWardBoundary,
      refetchProvinces,
      refetchWards,
    ],
  );
}
