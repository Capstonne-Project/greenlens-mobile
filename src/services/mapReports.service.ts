import type { AxiosRequestConfig } from 'axios';
import { apiPublic } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type { PublicMapDetailPayload, PublicMapReportsQuery } from '@/types/public-map.types';

export const mapReportsService = {
  /**
   * Map công khai — AllowAnonymous. GET /v1/map/reports
   * @see docs/PUBLIC_MAP_VIEWPORT_PLAN.md
   */
  getPublicInViewport: (query: PublicMapReportsQuery, config?: AxiosRequestConfig) =>
    apiPublic.get<ApiEnvelope<PublicMapDetailPayload>>('/map/reports', {
      ...config,
      params: {
        minLat: query.minLat,
        maxLat: query.maxLat,
        minLng: query.minLng,
        maxLng: query.maxLng,
        mode: query.mode,
        ...(query.limit != null ? { limit: query.limit } : {}),
        ...(query.gridLevel != null ? { gridLevel: query.gridLevel } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      },
    }),
};
