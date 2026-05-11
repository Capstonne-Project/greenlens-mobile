import type { MapViewportRegion, ViewportBBox } from '@/types/map-viewport.types';

export function regionToBBox(region: MapViewportRegion): ViewportBBox {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  return {
    minLat: region.latitude - halfLat,
    maxLat: region.latitude + halfLat,
    minLng: region.longitude - halfLng,
    maxLng: region.longitude + halfLng,
  };
}
