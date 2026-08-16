import type { GeoLatLng as LatLng } from '@/types/map-viewport.types';

/** Ray-casting — đủ chính xác cho bbox hành chính VN. */
export function isPointInRing(point: LatLng, ring: LatLng[]): boolean {
  if (ring.length < 3) {
    return false;
  }

  const x = point.longitude;
  const y = point.latitude;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].longitude;
    const yi = ring[i].latitude;
    const xj = ring[j].longitude;
    const yj = ring[j].latitude;

    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

/** Một polygon GeoJSON: ring[0] = outer, ring[1..] = holes. */
export function isPointInPolygonGroup(group: LatLng[][], point: LatLng): boolean {
  if (group.length === 0) {
    return false;
  }

  if (!isPointInRing(point, group[0])) {
    return false;
  }

  for (let i = 1; i < group.length; i++) {
    if (isPointInRing(point, group[i])) {
      return false;
    }
  }

  return true;
}

export function isPointInAnyPolygonGroup(groups: LatLng[][][], point: LatLng): boolean {
  if (groups.length === 0) {
    return true;
  }

  return groups.some((group) => isPointInPolygonGroup(group, point));
}
