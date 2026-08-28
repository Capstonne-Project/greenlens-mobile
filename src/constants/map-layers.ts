export type CitizenMapLayerId = 'standard';

export interface CitizenMapLayerOption {
  id: CitizenMapLayerId;
  label: string;
}

/**
 * Lớp bản đồ citizen home — Goong style qua MapLibre chỉ có 1 style nền
 * (`goong_map_web`), không có sẵn satellite/hybrid như Google Maps SDK cũ.
 * Giữ danh sách 1 phần tử để không phải sửa lại chỗ gọi `onChooseMapLayer`.
 */
export const CITIZEN_MAP_LAYERS: CitizenMapLayerOption[] = [
  { id: 'standard', label: 'Bản đồ' },
];

export const DEFAULT_CITIZEN_MAP_LAYER_ID: CitizenMapLayerId = 'standard';

export function getCitizenMapLayerById(id: CitizenMapLayerId): CitizenMapLayerOption {
  return CITIZEN_MAP_LAYERS.find((layer) => layer.id === id) ?? CITIZEN_MAP_LAYERS[0];
}
