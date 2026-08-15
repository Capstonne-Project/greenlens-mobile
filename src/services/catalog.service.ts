import { apiPublic } from '@/services/api';
import type { ApiEnvelope } from '@/types/api.types';
import type {
  CatalogPollutionCategoriesResponse,
  CatalogProvincesResponse,
  CatalogWardsResponse,
  ProvinceBoundaryResponse,
  WardBoundaryResponse,
} from '@/types/catalog.types';

export const catalogService = {
  getProvinces: () =>
    apiPublic.get<ApiEnvelope<CatalogProvincesResponse>>('/catalog/provinces'),

  getWardsByProvince: (provinceCode: string) =>
    apiPublic.get<ApiEnvelope<CatalogWardsResponse>>(
      `/catalog/provinces/${provinceCode}/wards`,
    ),

  getPollutionCategories: () =>
    apiPublic.get<ApiEnvelope<CatalogPollutionCategoriesResponse>>(
      '/catalog/pollution-categories',
    ),

  getProvinceBoundary: (provinceCode: string) =>
    apiPublic.get<ApiEnvelope<ProvinceBoundaryResponse>>(
      `/catalog/provinces/${provinceCode}/boundary`,
    ),

  getWardBoundary: (wardCode: string) =>
    apiPublic.get<ApiEnvelope<WardBoundaryResponse>>(
      `/catalog/wards/${wardCode}/boundary`,
    ),
};
