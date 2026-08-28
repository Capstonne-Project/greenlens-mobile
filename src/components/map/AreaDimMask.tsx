import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

import { colors } from '@/theme/colors';

interface LatLng {
  latitude: number;
  longitude: number;
}

interface AreaDimMaskProps {
  /** Mỗi group = 1 polygon: ring[0] là outer, ring[1..] là lỗ nội bộ */
  polygonGroups: LatLng[][][];
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

  return (
    <>
      {polygonGroups.map((group, index) => {
        const outer = group[0];
        if (!Array.isArray(outer) || outer.length < 3) return null;

        // GeoJSON Polygon: mỗi ring phải khép kín (điểm đầu = điểm cuối).
        const toClosedRing = (ring: LatLng[]) => {
          const coords = ring.map((p) => [p.longitude, p.latitude] as [number, number]);
          const first = coords[0];
          const last = coords[coords.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);
          return coords;
        };

        const rings = group.map(toClosedRing);

        return (
          <GeoJSONSource
            key={index}
            id={`area-dim-mask-${index}`}
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'Polygon', coordinates: rings },
            }}
          >
            <Layer
              id={`area-dim-mask-line-${index}`}
              type="line"
              paint={{ 'line-color': colors.primary, 'line-width': 2 }}
            />
          </GeoJSONSource>
        );
      })}
    </>
  );
}
