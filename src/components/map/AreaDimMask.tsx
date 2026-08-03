import { Polygon, type LatLng } from 'react-native-maps';

import { colors } from '@/theme/colors';

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

        return (
          <Polygon
            key={index}
            coordinates={outer}
            holes={group.slice(1)}
            fillColor="transparent"
            strokeColor={colors.primary}
            strokeWidth={2}
            tappable={false}
          />
        );
      })}
    </>
  );
}
