export interface GoongGeocodeCompound {
  commune?: string;
  district?: string;
  province?: string;
}

export interface GoongGeocodeResult {
  formatted_address?: string;
  address?: string;
  compound?: GoongGeocodeCompound;
  deprecated_compound?: GoongGeocodeCompound;
}

export interface GoongGeocodeResponse {
  results?: GoongGeocodeResult[];
  status?: string;
}

export interface GoongReverseGeocodeResult {
  formattedAddress?: string;
  addressLine?: string;
  provinceName?: string;
  communeName?: string;
}
