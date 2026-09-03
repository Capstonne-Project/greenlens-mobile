import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';

import { getGoongStyleUrl } from '@/constants/map-config';
import { regionToZoom } from '@/components/map/GoongMapView';

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
  const [mapWidth, setMapWidth] = useState<number | null>(null);

  const points = routePath && routePath.length > 0 ? routePath : [origin, destination];
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;

  // Bao trọn cả route (không chỉ 2 điểm đầu/cuối) theo cả 2 trục, cộng đệm 30% để không cắt sát viền.
  const latSpan = (maxLat - minLat) * 1.3;
  // Quy đổi chênh lệch longitude về "độ vĩ tương đương" theo cos(latitude) để không bị lệch gần cực.
  const lngSpanAsLat = (maxLng - minLng) * Math.cos((latitude * Math.PI) / 180) * 1.3;
  // Map hiển thị theo tỷ lệ khung hình width/height thực (thường rộng hơn cao nhiều trong dialog
  // này) — nếu chỉ so latSpan với lngSpanAsLat như hai trục vuông thì longitude span bị "nén" quá
  // mức vào khung ngang rộng, khiến zoom bị tính sát hơn thực tế cần. Quy lngSpanAsLat về "độ vĩ
  // tương đương nếu framing theo chiều cao" bằng cách nhân với aspect ratio (width/height).
  const aspectRatio = mapWidth ? mapWidth / height : 16 / 9;
  const latitudeDelta = Math.max(latSpan, lngSpanAsLat / aspectRatio, 0.006);

  const lineCoords = (routePath ?? [origin, destination]).map((p) => [p.longitude, p.latitude]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setMapWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      className="overflow-hidden rounded-xl border border-border"
      style={{ height }}
      onLayout={handleLayout}
    >
      {mapWidth === null ? null : (
        <Map style={{ flex: 1 }} mapStyle={getGoongStyleUrl()} dragPan={false} touchZoom={false} touchRotate={false} touchPitch={false}>
          <Camera
            initialViewState={{
              center: [longitude, latitude],
              zoom: regionToZoom(latitudeDelta),
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
      )}
    </View>
  );
}
