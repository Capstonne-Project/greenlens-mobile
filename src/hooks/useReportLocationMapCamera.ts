import { useEffect, useRef, type RefObject } from 'react';
import type MapView from 'react-native-maps';
import type { LatLng } from 'react-native-maps';

interface UseReportLocationMapCameraOptions {
  enabled: boolean;
  mapRef: RefObject<MapView | null>;
  marker: LatLng | null;
  provinceCode: string | null;
  wardCode: string | null;
  provincePolygons: LatLng[][];
  wardPolygons: LatLng[][];
}

const MAP_EDGE_PADDING = { top: 48, right: 48, bottom: 48, left: 48 };

export function useReportLocationMapCamera({
  enabled,
  mapRef,
  marker,
  provinceCode,
  wardCode,
  provincePolygons,
  wardPolygons,
}: UseReportLocationMapCameraOptions): void {
  const lastBoundaryKeyRef = useRef<string | null>(null);
  const lastMarkerKeyRef = useRef<string | null>(null);
  const didInitialCenterRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      lastBoundaryKeyRef.current = null;
      lastMarkerKeyRef.current = null;
      didInitialCenterRef.current = false;
    }
  }, [enabled]);

  // Fit ranh giới khi auto-chọn / user chọn tỉnh hoặc phường
  useEffect(() => {
    if (!enabled) return;

    const boundaryKey = wardCode ? `ward:${wardCode}` : provinceCode ? `province:${provinceCode}` : null;
    if (!boundaryKey || lastBoundaryKeyRef.current === boundaryKey) return;

    const rings = wardCode && wardPolygons.length ? wardPolygons : provincePolygons;
    if (!rings.length) return;

    lastBoundaryKeyRef.current = boundaryKey;
    mapRef.current?.fitToCoordinates(rings.flat(), {
      edgePadding: MAP_EDGE_PADDING,
      animated: true,
    });
  }, [enabled, mapRef, provinceCode, provincePolygons, wardCode, wardPolygons]);

  // Căn map lần đầu vào step khi chưa có ranh giới
  useEffect(() => {
    if (!enabled || didInitialCenterRef.current || !marker) return;
    if (wardPolygons.length || provincePolygons.length) return;

    didInitialCenterRef.current = true;
    mapRef.current?.animateToRegion(
      { latitude: marker.latitude, longitude: marker.longitude, latitudeDelta: 0.06, longitudeDelta: 0.06 },
      400,
    );
  }, [enabled, mapRef, marker, provincePolygons.length, wardPolygons.length]);

  // Di chuyển pin trong cùng phường/tỉnh — giữ ranh giới, chỉ pan tới pin
  useEffect(() => {
    if (!enabled || !marker) return;

    const markerKey = `${marker.latitude.toFixed(5)},${marker.longitude.toFixed(5)}`;
    if (lastMarkerKeyRef.current === markerKey) return;

    const boundaryKey = wardCode ? `ward:${wardCode}` : provinceCode ? `province:${provinceCode}` : null;
    const boundaryUnchanged = boundaryKey != null && lastBoundaryKeyRef.current === boundaryKey;

    lastMarkerKeyRef.current = markerKey;

    if (boundaryUnchanged) {
      mapRef.current?.animateToRegion(
        { latitude: marker.latitude, longitude: marker.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 },
        350,
      );
    }
  }, [enabled, mapRef, marker, provinceCode, wardCode]);
}
