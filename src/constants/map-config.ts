/**
 * Bản đồ nền: **MapLibre GL** (`@maplibre/maplibre-react-native`) dùng style URL của **Goong Maptiles**.
 * Đồng nhất giao diện iOS/Android — thay cho `react-native-maps` (Apple MapKit / Google Maps).
 *
 * **Goong REST API** (Geocode, Directions, Places, …) là key riêng, xem `src/services/goong.service.ts`.
 *
 * @see https://docs.goong.io/mobiles/
 */

const GOONG_MAPTILES_KEY = process.env.EXPO_PUBLIC_GOONG_MAPTILES_KEY;

export type GoongStyleId = 'street' | 'light' | 'dark' | 'navigationDay' | 'navigationNight';

/** Goong không cấp style vệ tinh/hybrid — chỉ có 5 style vector này (cùng dùng chung 1 Maptiles key). */
const GOONG_STYLE_PATHS: Record<GoongStyleId, string> = {
  street: 'goong_map_web.json',
  light: 'goong_light_v2.json',
  dark: 'goong_map_dark.json',
  navigationDay: 'navigation_day.json',
  navigationNight: 'navigation_night.json',
};

export function getGoongStyleUrl(styleId: GoongStyleId): string | null {
  if (!GOONG_MAPTILES_KEY) return null;
  return `https://tiles.goong.io/assets/${GOONG_STYLE_PATHS[styleId]}?api_key=${GOONG_MAPTILES_KEY}`;
}

export const GOONG_STYLE_URL = getGoongStyleUrl('street');
