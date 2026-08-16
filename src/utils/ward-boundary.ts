import { catalogService } from '@/services/catalog.service';
import { extractPolygonGroups, type GeoJsonCollection } from '@/utils/geojson-boundaries';
import type { GeoLatLng as LatLng } from '@/types/map-viewport.types';

async function loadBoundaryGeometry(
  code: string,
  fetchRaw: () => Promise<string | null>,
): Promise<GeoJsonCollection> {
  const raw = await fetchRaw();
  if (!raw) {
    throw new Error('BOUNDARY_NOT_FOUND');
  }

  const geometry = JSON.parse(raw);
  const collection: GeoJsonCollection = { geometry };

  if (__DEV__) {
    console.log('[ward-boundary] loaded', code, 'geometry type:', geometry?.type);
  }

  return collection;
}

export async function fetchProvinceBoundaryPolygons(provinceCode: string): Promise<LatLng[][]> {
  const groups = await fetchProvinceBoundaryGroups(provinceCode);
  return groups.flatMap((group) => group);
}

export async function fetchProvinceBoundaryGroups(provinceCode: string): Promise<LatLng[][][]> {
  const collection = await loadBoundaryGeometry(provinceCode, async () => {
    const res = await catalogService.getProvinceBoundary(provinceCode);
    return res.data.data.geoJson;
  });
  return extractPolygonGroups(collection);
}

export async function fetchWardBoundaryPolygons(wardCode: string): Promise<LatLng[][]> {
  const groups = await fetchWardBoundaryGroups(wardCode);
  return groups.flatMap((group) => group);
}

export async function fetchWardBoundaryGroups(wardCode: string): Promise<LatLng[][][]> {
  const collection = await loadBoundaryGeometry(wardCode, async () => {
    const res = await catalogService.getWardBoundary(wardCode);
    return res.data.data.geoJson;
  });
  return extractPolygonGroups(collection);
}
