import type { GoongStyleId } from '@/constants/map-config';

export type CitizenMapLayerId = GoongStyleId;

export interface CitizenMapLayerOption {
  id: CitizenMapLayerId;
  label: string;
}

/** Lớp bản đồ citizen home — style Goong Maptiles (không có vệ tinh/hybrid). */
export const CITIZEN_MAP_LAYERS: CitizenMapLayerOption[] = [
  { id: 'street', label: 'Bản đồ' },
  { id: 'light', label: 'Sáng' },
  { id: 'dark', label: 'Tối' },
  { id: 'navigationDay', label: 'Chỉ đường (ngày)' },
  { id: 'navigationNight', label: 'Chỉ đường (đêm)' },
];

export const DEFAULT_CITIZEN_MAP_LAYER_ID: CitizenMapLayerId = 'street';

export function getCitizenMapLayerById(id: CitizenMapLayerId): CitizenMapLayerOption {
  return CITIZEN_MAP_LAYERS.find((layer) => layer.id === id) ?? CITIZEN_MAP_LAYERS[0];
}
