import {
  extractPolygonGroups,
  extractWardPolygonGroups,
  type GeoJsonCollection,
} from '@/utils/geojson-boundaries';
import type { LatLng } from 'react-native-maps';

const rawGeoJsonCache = new Map<string, GeoJsonCollection>();

export async function fetchGeoJsonCollection(boundaryUrl: string): Promise<GeoJsonCollection> {
  const cached = rawGeoJsonCache.get(boundaryUrl);
  if (cached) {
    return cached;
  }

  const response = await fetch(boundaryUrl);
  if (!response.ok) {
    throw new Error('BOUNDARY_FETCH_FAILED');
  }

  const geoJson = (await response.json()) as GeoJsonCollection;
  rawGeoJsonCache.set(boundaryUrl, geoJson);
  return geoJson;
}

export async function fetchProvinceBoundaryPolygons(boundaryUrl: string): Promise<LatLng[][]> {
  const groups = await fetchProvinceBoundaryGroups(boundaryUrl);
  return groups.flatMap((group) => group);
}

export async function fetchProvinceBoundaryGroups(boundaryUrl: string): Promise<LatLng[][][]> {
  const geoJson = await fetchGeoJsonCollection(boundaryUrl);
  return extractPolygonGroups(geoJson);
}

export async function fetchWardBoundaryPolygons(
  boundaryUrl: string,
  wardCode: string,
): Promise<LatLng[][]> {
  const groups = await fetchWardBoundaryGroups(boundaryUrl, wardCode);
  return groups.flatMap((group) => group);
}

export async function fetchWardBoundaryGroups(
  boundaryUrl: string,
  wardCode: string,
): Promise<LatLng[][][]> {
  const geoJson = await fetchGeoJsonCollection(boundaryUrl);
  return extractWardPolygonGroups(geoJson, wardCode);
}
