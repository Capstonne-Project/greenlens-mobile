import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

import type { GeoLatLng } from '@/types/map-viewport.types';
import { colors } from '@/theme/colors';

interface AreaDimMaskProps {
  /** Mỗi group = 1 polygon: ring[0] là outer, ring[1..] là lỗ nội bộ */
  polygonGroups: GeoLatLng[][][];
}

function ringToGeoJson(ring: GeoLatLng[]): GeoJSON.Position[] {
  const coords = ring.map((p) => [p.longitude, p.latitude] as GeoJSON.Position);
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    coords.push(first);
  }
  return coords;
}

/**
 * Vẽ viền ranh giới của vùng đang chọn.
 *
 * Trước đây dùng world-polygon + `holes` để làm mờ phần ngoài vùng, nhưng
 * `holes` không đáng tin cậy trên Apple Maps/MapKit (iOS không set provider
 * Google) — cả vùng trong lẫn ngoài đều bị tô, ngược với mong đợi. Bỏ hẳn lớp
 * mờ, chỉ giữ viền ranh giới cho đơn giản và nhất quán trên mọi platform.
 */
export function AreaDimMask({ polygonGroups }: AreaDimMaskProps) {
  if (polygonGroups.length === 0) return null;

  const featureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: polygonGroups
      .map((group) => group[0])
      .filter((outer): outer is GeoLatLng[] => Array.isArray(outer) && outer.length >= 3)
      .map((outer) => ({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: ringToGeoJson(outer),
        },
      })),
  };

  return (
    <GeoJSONSource id="area-dim-mask" data={featureCollection}>
      <Layer
        id="area-dim-mask-line"
        type="line"
        layout={{ 'line-join': 'round', 'line-cap': 'round' }}
        paint={{ 'line-color': colors.primary, 'line-width': 2 }}
      />
    </GeoJSONSource>
  );
}
