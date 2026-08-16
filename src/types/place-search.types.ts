import type { GeoLatLng as LatLng } from '@/types/map-viewport.types';

export type PlaceSuggestionKind = 'province' | 'ward';

export interface PlaceSuggestion {
  kind: PlaceSuggestionKind;
  /** Mã tỉnh 2 số hoặc mã phường 5 số */
  code: string;
  name: string;
  /** Nhãn phụ: "Tỉnh / Thành phố" hoặc tên tỉnh cha */
  subtitle: string;
  /** Phường cần mã tỉnh để lấy đúng file GeoJSON */
  provinceCode: string;
}

/** Vùng đang được focus trên map sau khi chọn gợi ý. */
export interface AreaFocus {
  kind: PlaceSuggestionKind;
  code: string;
  name: string;
  /**
   * Mỗi group = 1 polygon: ring[0] là outer, ring[1..] là lỗ (đảo/enclave).
   * Đã bỏ mảnh vụn xa bờ và lọc thưa điểm qua `prepareAreaShape`.
   */
  polygonGroups: LatLng[][][];
  /** Toạ độ để `fitToCoordinates` — chỉ gồm outer ring của các mảnh đáng kể */
  fitCoords: LatLng[];
}
