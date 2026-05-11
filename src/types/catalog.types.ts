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
