import { View } from 'react-native';
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
  const latitude = (origin.latitude + destination.latitude) / 2;
  const longitude = (origin.longitude + destination.longitude) / 2;
  const latitudeDelta = Math.max(Math.abs(origin.latitude - destination.latitude) * 2.2, 0.006);

  const lineCoords = (routePath ?? [origin, destination]).map((p) => [p.longitude, p.latitude]);

  return (
    <View className="overflow-hidden rounded-xl border border-border" style={{ height }}>
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
    </View>
  );
}
