import { useCallback, useEffect, useMemo, useState } from 'react';
import { catalogService } from '@/services/catalog.service';
import type { CatalogProvince, CatalogWard } from '@/types/catalog.types';
import {
  fetchProvinceBoundaryGroups,
  fetchWardBoundaryGroups,
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
  loadProvinceBoundary: (provinceCode: string | null) => Promise<void>;
  loadWardBoundary: (wardCode: string | null) => Promise<void>;
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

  const loadProvinceBoundary = useCallback(async (provinceCode: string | null) => {
    if (!provinceCode) {
      setProvincePolygons([]);
      setProvincePolygonGroups([]);
      return;
    }

    try {
      // Lấy groups trước rồi derive polygons từ groups (không gọi fetchProvinceBoundaryPolygons
      // song song) — tránh double-fetch cùng 1 GeoJSON lớn khi cache chưa kịp populate.
      const groups = await fetchProvinceBoundaryGroups(provinceCode);
      if (__DEV__) console.log('[useCatalogAddress] province groups loaded', provinceCode, 'groups:', groups.length, 'points:', groups.flat(2).length);
      setProvincePolygons(groups.flatMap((group) => group));
      setProvincePolygonGroups(groups);
    } catch (error) {
      if (__DEV__) console.warn('[useCatalogAddress] loadProvinceBoundary failed', provinceCode, error);
      setProvincePolygons([]);
      setProvincePolygonGroups([]);
    }
  }, []);

  const loadWardBoundary = useCallback(async (wardCode: string | null) => {
    if (!wardCode) {
      setWardPolygons([]);
      setWardPolygonGroups([]);
      return;
    }

    try {
      const groups = await fetchWardBoundaryGroups(wardCode);
      if (__DEV__) console.log('[useCatalogAddress] ward groups loaded', wardCode, 'groups:', groups.length, 'points:', groups.flat(2).length);
      setWardPolygons(groups.flatMap((group) => group));
      setWardPolygonGroups(groups);
    } catch (error) {
      if (__DEV__) console.warn('[useCatalogAddress] loadWardBoundary failed', wardCode, error);
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
