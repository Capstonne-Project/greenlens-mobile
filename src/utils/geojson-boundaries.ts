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

interface GeoJsonFeature {
  geometry?: GeoJsonGeometry;
}

interface GeoJsonCollection {
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

export function getPolygonBounds(rings: LatLng[][]): LatLng[] {
  const points = rings.flat();
  if (!points.length) {
    return [];
  }

  return points;
}
