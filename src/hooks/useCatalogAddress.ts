import { useCallback, useEffect, useMemo, useState } from 'react';
import { catalogService } from '@/services/catalog.service';
import type { CatalogProvince, CatalogWard } from '@/types/catalog.types';
import {
  fetchProvinceBoundaryGroups,
  fetchProvinceBoundaryPolygons,
  fetchWardBoundaryGroups,
  fetchWardBoundaryPolygons,
} from '@/utils/ward-boundary';
import type { LatLng } from 'react-native-maps';

interface UseCatalogAddressResult {
  provinces: CatalogProvince[];
  wards: CatalogWard[];
  isLoadingProvinces: boolean;
  isLoadingWards: boolean;
  errorMessage: string | null;
  provincePolygons: LatLng[][];
  wardPolygons: LatLng[][];
  provincePolygonGroups: LatLng[][][];
  wardPolygonGroups: LatLng[][][];
  loadProvinceBoundary: (boundaryUrl: string | null) => Promise<void>;
  loadWardBoundary: (boundaryUrl: string | null, wardCode: string | null) => Promise<void>;
  refetchProvinces: () => Promise<void>;
  refetchWards: (provinceCode: string) => Promise<void>;
}

export function useCatalogAddress(): UseCatalogAddressResult {
  const [provinces, setProvinces] = useState<CatalogProvince[]>([]);
  const [wards, setWards] = useState<CatalogWard[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(true);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [provincePolygons, setProvincePolygons] = useState<LatLng[][]>([]);
  const [wardPolygons, setWardPolygons] = useState<LatLng[][]>([]);
  const [provincePolygonGroups, setProvincePolygonGroups] = useState<LatLng[][][]>([]);
  const [wardPolygonGroups, setWardPolygonGroups] = useState<LatLng[][][]>([]);

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
      setWards([]);
    } finally {
      setIsLoadingWards(false);
    }
  }, []);

  const loadProvinceBoundary = useCallback(async (boundaryUrl: string | null) => {
    if (!boundaryUrl) {
      setProvincePolygons([]);
      setProvincePolygonGroups([]);
      return;
    }

    try {
      const [polygons, groups] = await Promise.all([
        fetchProvinceBoundaryPolygons(boundaryUrl),
        fetchProvinceBoundaryGroups(boundaryUrl),
      ]);
      setProvincePolygons(polygons);
      setProvincePolygonGroups(groups);
    } catch {
      setProvincePolygons([]);
      setProvincePolygonGroups([]);
    }
  }, []);

  const loadWardBoundary = useCallback(async (boundaryUrl: string | null, wardCode: string | null) => {
    if (!boundaryUrl || !wardCode) {
      setWardPolygons([]);
      setWardPolygonGroups([]);
      return;
    }

    try {
      const [polygons, groups] = await Promise.all([
        fetchWardBoundaryPolygons(boundaryUrl, wardCode),
        fetchWardBoundaryGroups(boundaryUrl, wardCode),
      ]);
      setWardPolygons(polygons);
      setWardPolygonGroups(groups);
    } catch {
      setWardPolygons([]);
      setWardPolygonGroups([]);
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
      provincePolygonGroups,
      wardPolygonGroups,
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
      provincePolygonGroups,
      wardPolygonGroups,
      loadProvinceBoundary,
      loadWardBoundary,
      refetchProvinces,
      refetchWards,
    ],
  );
}
