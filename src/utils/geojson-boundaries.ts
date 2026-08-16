import type { GeoLatLng as LatLng } from '@/types/map-viewport.types';

type GeoJsonGeometry =
  | {
      type: 'Polygon';
      coordinates: number[][][];
    }
  | {
      type: 'MultiPolygon';
      coordinates: number[][][][];
    };

interface GeoJsonFeatureProperties {
  /** Một số file CDN (vd. TP.HCM) dùng `ma_xa` thay vì `code`. */
  code?: string;
  ma_xa?: string;
  name?: string;
  ten_xa?: string;
  ward_name?: string;
}

interface GeoJsonFeature {
  properties?: GeoJsonFeatureProperties;
  geometry?: GeoJsonGeometry;
}

/** Chuẩn hóa mã phường 5 chữ số — catalog BE và GeoJSON có thể khác padding. */
export function normalizeWardCode(value: string | number): string {
  return String(value).trim().padStart(5, '0');
}

function resolveFeatureWardCode(properties?: GeoJsonFeatureProperties): string | null {
  if (!properties) {
    return null;
  }

  const raw = properties.code ?? properties.ma_xa;
  if (raw == null || String(raw).trim() === '') {
    return null;
  }

  return normalizeWardCode(raw);
}

export function findWardFeature(
  geoJson: GeoJsonCollection,
  wardCode: string,
): GeoJsonFeature | undefined {
  const target = normalizeWardCode(wardCode);
  return geoJson.features?.find((item) => resolveFeatureWardCode(item.properties) === target);
}

export interface GeoJsonCollection {
  type?: string;
  features?: GeoJsonFeature[];
  geometry?: GeoJsonGeometry;
}

function toLatLngRing(ring: number[][]): LatLng[] {
  return ring.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));
}

/** Khoảng cách vuông góc từ điểm tới đường thẳng point-start→end (bình phương, tránh sqrt). */
function perpendicularDistanceSq(point: LatLng, start: LatLng, end: LatLng): number {
  const dx = end.longitude - start.longitude;
  const dy = end.latitude - start.latitude;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    const ddx = point.longitude - start.longitude;
    const ddy = point.latitude - start.latitude;
    return ddx * ddx + ddy * ddy;
  }

  const cross = dx * (start.latitude - point.latitude) - dy * (start.longitude - point.longitude);
  return (cross * cross) / lengthSq;
}

/**
 * Douglas-Peucker — giảm số điểm của 1 ring mà vẫn giữ hình dạng, tránh render
 * hàng chục nghìn coordinate lên MapView (native Polygon rất nặng, dễ OOM/crash
 * khi ranh giới hành chính có độ chi tiết cao).
 */
function simplifyRing(ring: LatLng[], toleranceSq: number): LatLng[] {
  if (ring.length <= 3) return ring;

  let maxDistSq = 0;
  let maxIndex = 0;
  const last = ring.length - 1;

  for (let i = 1; i < last; i++) {
    const distSq = perpendicularDistanceSq(ring[i], ring[0], ring[last]);
    if (distSq > maxDistSq) {
      maxDistSq = distSq;
      maxIndex = i;
    }
  }

  if (maxDistSq <= toleranceSq) {
    return [ring[0], ring[last]];
  }

  const left = simplifyRing(ring.slice(0, maxIndex + 1), toleranceSq);
  const right = simplifyRing(ring.slice(maxIndex), toleranceSq);
  return [...left.slice(0, -1), ...right];
}

/**
 * Tolerance tính bằng độ (lat/lng) — ~0.0005 ≈ 55m ở xích đạo. Ranh giới hành
 * chính chỉ cần đủ mịn để nhận diện hình dạng ở zoom level bản đồ di động,
 * không cần độ chính xác đo đạc.
 */
const BOUNDARY_SIMPLIFY_TOLERANCE = 0.0005;

/**
 * Mỗi group render thành 1 native `<Polygon>` riêng — quá nhiều group (đảo nhỏ,
 * mảnh vụn địa giới) cùng lúc là chi phí render nặng hơn cả số điểm/ring.
 * Giữ tối đa N group lớn nhất (theo số điểm), đủ để thể hiện đúng hình dạng
 * tổng thể của tỉnh/phường mà không kéo theo hàng chục mảnh nhỏ không đáng kể.
 */
const MAX_POLYGON_GROUPS = 8;

function simplifyGroups(groups: LatLng[][][]): LatLng[][][] {
  const toleranceSq = BOUNDARY_SIMPLIFY_TOLERANCE * BOUNDARY_SIMPLIFY_TOLERANCE;
  const simplified = groups.map((rings) => rings.map((ring) => simplifyRing(ring, toleranceSq)));

  if (simplified.length <= MAX_POLYGON_GROUPS) {
    return simplified;
  }

  return [...simplified]
    .sort((a, b) => b.reduce((sum, r) => sum + r.length, 0) - a.reduce((sum, r) => sum + r.length, 0))
    .slice(0, MAX_POLYGON_GROUPS);
}

export function extractPolygonRings(geoJson: GeoJsonCollection): LatLng[][] {
  const rings: LatLng[][] = [];

  const pushGeometry = (geometry?: GeoJsonGeometry) => {
    if (!geometry) return;

    if (geometry.type === 'Polygon') {
      geometry.coordinates.forEach((ring) => {
        if (ring.length >= 3) {
          rings.push(toLatLngRing(ring));
        }
      });
      return;
    }

    geometry.coordinates.forEach((polygon) => {
      polygon.forEach((ring) => {
        if (ring.length >= 3) {
          rings.push(toLatLngRing(ring));
        }
      });
    });
  };

  if (geoJson.geometry) {
    pushGeometry(geoJson.geometry);
  }

  geoJson.features?.forEach((feature) => {
    pushGeometry(feature.geometry);
  });

  return rings;
}

/** Mỗi phần tử = một polygon GeoJSON (outer ring + optional holes). */
export function extractPolygonGroups(geoJson: GeoJsonCollection): LatLng[][][] {
  const groups: LatLng[][][] = [];

  const pushGeometry = (geometry?: GeoJsonGeometry) => {
    if (!geometry) return;

    if (geometry.type === 'Polygon') {
      const rings = geometry.coordinates
        .filter((ring) => ring.length >= 3)
        .map((ring) => toLatLngRing(ring));
      if (rings.length > 0) {
        groups.push(rings);
      }
      return;
    }

    geometry.coordinates.forEach((polygon) => {
      const rings = polygon.filter((ring) => ring.length >= 3).map((ring) => toLatLngRing(ring));
      if (rings.length > 0) {
        groups.push(rings);
      }
    });
  };

  if (geoJson.geometry) {
    pushGeometry(geoJson.geometry);
  }

  geoJson.features?.forEach((feature) => {
    pushGeometry(feature.geometry);
  });

  return simplifyGroups(groups);
}

/** Ward CDN files are FeatureCollections — filter by ward code (`code` or `ma_xa`) before drawing. */
export function extractWardPolygonRings(geoJson: GeoJsonCollection, wardCode: string): LatLng[][] {
  const feature = findWardFeature(geoJson, wardCode);
  if (!feature) {
    return [];
  }

  return extractPolygonRings({ features: [feature] });
}

export function extractWardPolygonGroups(geoJson: GeoJsonCollection, wardCode: string): LatLng[][][] {
  const feature = findWardFeature(geoJson, wardCode);
  if (!feature) {
    return [];
  }

  // extractPolygonGroups đã simplify — không cần simplify lại ở đây.
  return extractPolygonGroups({ features: [feature] });
}

export function getPolygonBounds(rings: LatLng[][]): LatLng[] {
  const points = rings.flat();
  if (!points.length) {
    return [];
  }

  return points;
}
