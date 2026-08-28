/**
 * Bản đồ nền: **MapLibre** (`@maplibre/maplibre-react-native`) dùng style URL Goong Maptiles.
 * Google Maps SDK yêu cầu `com.google.android.geo.API_KEY` trong AndroidManifest — không có
 * key này thì `react-native-maps` (PROVIDER_GOOGLE mặc định trên Android) crash ngay khi mở
 * màn hình bản đồ. Chuyển sang MapLibre + Goong style tránh phụ thuộc Google Maps key.
 *
 * @see https://docs.goong.io/maptiles
 */
export const GOONG_MAPTILES_KEY = process.env.EXPO_PUBLIC_GOONG_MAPTILES_KEY;

export function getGoongStyleUrl(): string {
  return `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPTILES_KEY ?? ''}`;
}
