import { View } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';

import { getGoongStyleUrl } from '@/constants/map-config';

interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface RouteMiniMapProps {
  origin: GeoPoint;
  destination: GeoPoint;
  /** Đường đi thật (Goong Directions) — nếu null vẽ đường thẳng nét đứt giữa 2 điểm. */
  routePath?: GeoPoint[] | null;
  originColor: string;
  destinationColor: string;
  routeColor: string;
  height?: number;
}

/**
 * Bản đồ mini tĩnh (không tương tác) dùng chung cho các dialog xác nhận vị trí
 * (TooFarDialog, CheckInOverrideDialog, LocationOverrideDialog) — 2 điểm + tuyến
 * đường nối giữa chúng.
 */
export function RouteMiniMap({
  origin,
  destination,
  routePath,
  originColor,
  destinationColor,
  routeColor,
  height = 160,
}: RouteMiniMapProps) {
  const points = routePath && routePath.length > 0 ? routePath : [origin, destination];
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  // Đệm tối thiểu khi bounding box suy biến về 1 điểm (origin trùng destination) — fitBounds cần
  // một box có diện tích để tính zoom hợp lệ.
  const MIN_SPAN = 0.0015;
  const rawMinLat = Math.min(...lats);
  const rawMaxLat = Math.max(...lats);
  const rawMinLng = Math.min(...lngs);
  const rawMaxLng = Math.max(...lngs);
  const latPad = Math.max(0, (MIN_SPAN - (rawMaxLat - rawMinLat)) / 2);
  const lngPad = Math.max(0, (MIN_SPAN - (rawMaxLng - rawMinLng)) / 2);
  const minLat = rawMinLat - latPad;
  const maxLat = rawMaxLat + latPad;
  const minLng = rawMinLng - lngPad;
  const maxLng = rawMaxLng + lngPad;

  // Bao đúng 2 góc của bounding box quanh toàn bộ điểm/route — MapLibre tự tính zoom + center để
  // khung hình vừa khít cả 2 điểm, không phụ thuộc vào việc tự quy đổi latitudeDelta → zoom (dễ
  // sai lệch theo aspect ratio thực tế của khung chứa).
  const lineCoords = (routePath ?? [origin, destination]).map((p) => [p.longitude, p.latitude]);

  return (
    <View className="overflow-hidden rounded-xl border border-border" style={{ height }}>
      <Map style={{ flex: 1 }} mapStyle={getGoongStyleUrl()} dragPan={false} touchZoom={false} touchRotate={false} touchPitch={false}>
        <Camera
          initialViewState={{
            bounds: [minLng, minLat, maxLng, maxLat],
            padding: { top: 40, bottom: 40, left: 40, right: 40 },
          }}
        />
        <GeoJSONSource
          id="route-mini-map-line"
          data={{
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: lineCoords },
          }}
        >
          <Layer
            id="route-mini-map-line-layer"
            type="line"
            paint={{
              'line-color': routeColor,
              'line-width': routePath ? 3 : 2,
              ...(routePath ? {} : { 'line-dasharray': [2, 1.3] }),
            }}
          />
        </GeoJSONSource>
        <Marker id="route-mini-map-origin" lngLat={[origin.longitude, origin.latitude]} anchor="bottom">
          <View className="h-4 w-4 rounded-full border-2 border-white" style={{ backgroundColor: originColor }} />
        </Marker>
        <Marker id="route-mini-map-destination" lngLat={[destination.longitude, destination.latitude]} anchor="bottom">
          <View className="h-4 w-4 rounded-full border-2 border-white" style={{ backgroundColor: destinationColor }} />
        </Marker>
      </Map>
    </View>
  );
}
