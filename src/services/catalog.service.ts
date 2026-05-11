import { apiPublic } from '@/services/api';
import type { ApiEnvelope } from '@/types/api.types';
import type {
  CatalogPollutionCategoriesResponse,
  CatalogProvincesResponse,
  CatalogWardsResponse,
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
};
