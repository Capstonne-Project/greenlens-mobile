import type { AxiosRequestConfig } from 'axios';
import { apiPublic } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type { MapSummaryQuery, MapViewportSummaryData } from '@/types/map-summary.types';

export const mapSummaryService = {
  /** Map công khai — AllowAnonymous. GET /v1/map/summary */
  getViewportSummary: (query: MapSummaryQuery, config?: AxiosRequestConfig) => {
    if (__DEV__) console.log('[mapSummary] query params:', query);
    return apiPublic.get<ApiEnvelope<MapViewportSummaryData>>('/map/summary', {
      ...config,
      params: {
        MinLat: query.minLat,
        MaxLat: query.maxLat,
        MinLng: query.minLng,
        MaxLng: query.maxLng,
        ...(query.days != null ? { Days: query.days } : {}),
        ...(query.categoryId ? { CategoryId: query.categoryId } : {}),
      },
    });
  },
};
