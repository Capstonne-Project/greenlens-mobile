import type { AxiosRequestConfig } from 'axios';
import { apiPublic } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type { PublicMapDetailPayload, PublicMapReportsQuery } from '@/types/public-map.types';

export const mapReportsService = {
  /**
   * Map công khai — AllowAnonymous. GET /v1/map/reports
   * @see docs/PUBLIC_MAP_VIEWPORT_PLAN.md
   */
  getPublicInViewport: (query: PublicMapReportsQuery, config?: AxiosRequestConfig) => {
    if (__DEV__) console.log('[mapReports] query params:', query);
    return apiPublic.get<ApiEnvelope<PublicMapDetailPayload>>('/map/reports', {
      ...config,
      params: {
        MinLat: query.minLat,
        MaxLat: query.maxLat,
        MinLng: query.minLng,
        MaxLng: query.maxLng,
        Mode: query.mode,
        ...(query.limit != null ? { Limit: query.limit } : {}),
        ...(query.gridLevel != null ? { GridLevel: query.gridLevel } : {}),
        ...(query.categoryId ? { CategoryId: query.categoryId } : {}),
      },
    });
  },
};
