export interface CatalogProvince {
  code: string;
  name: string;
  boundaryUrl: string | null;
}

export interface CatalogWard {
  code: string;
  name: string;
  unitAbbreviation: string | null;
  boundaryUrl: string | null;
}

export interface CatalogProvincesResponse {
  items: CatalogProvince[];
}

export interface CatalogWardsResponse {
  items: CatalogWard[];
}

export interface ProvinceBoundaryResponse {
  provinceCode: string;
  name: string | null;
  geoJson: string | null;
  /** DEPRECATED — CDN cũ đã chết, luôn null. */
  boundaryUrl: string | null;
}

export interface WardBoundaryResponse {
  wardCode: string;
  name: string | null;
  geoJson: string | null;
  /** DEPRECATED — CDN cũ đã chết, luôn null. */
  boundaryUrl: string | null;
}

export interface CatalogPollutionCategory {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  icon?: string | null;
}

export interface CatalogPollutionCategoriesResponse {
  items: CatalogPollutionCategory[];
}
