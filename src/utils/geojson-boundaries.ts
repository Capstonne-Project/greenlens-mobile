import type { LatLng } from 'react-native-maps';

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

  return groups;
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

  return extractPolygonGroups({ features: [feature] });
}

export function getPolygonBounds(rings: LatLng[][]): LatLng[] {
  const points = rings.flat();
  if (!points.length) {
    return [];
  }

  return points;
}
