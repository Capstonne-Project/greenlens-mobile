import type { MapType } from 'react-native-maps';

export type CitizenMapLayerId = 'standard' | 'satellite' | 'hybrid';

export interface CitizenMapLayerOption {
  id: CitizenMapLayerId;
  label: string;
  mapType: MapType;
}

/** Lớp bản đồ citizen home — `mapType` của react-native-maps */
export const CITIZEN_MAP_LAYERS: CitizenMapLayerOption[] = [
  { id: 'standard', label: 'Bản đồ', mapType: 'standard' },
  { id: 'satellite', label: 'Vệ tinh', mapType: 'satellite' },
  { id: 'hybrid', label: 'Hỗn hợp', mapType: 'hybrid' },
];

export const DEFAULT_CITIZEN_MAP_LAYER_ID: CitizenMapLayerId = 'standard';

export function getCitizenMapLayerById(id: CitizenMapLayerId): CitizenMapLayerOption {
  return CITIZEN_MAP_LAYERS.find((layer) => layer.id === id) ?? CITIZEN_MAP_LAYERS[0];
}
