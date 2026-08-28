import { useEffect, useRef, type RefObject } from 'react';
import type { GoongMapViewRef, LatLng } from '@/components/map/GoongMapView';

interface UseReportLocationMapCameraOptions {
  enabled: boolean;
  mapRef: RefObject<GoongMapViewRef | null>;
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

  // Fit ranh giới khi auto-chọn / user chọn tỉnh hoặc phường.
  // Key theo cả số lượng điểm polygon — vì provincePolygons/wardPolygons cập nhật async sau khi
  // provinceCode/wardCode đổi, nên rings có thể vẫn là dữ liệu ranh giới CŨ trong 1-2 lần render đầu.
  // Nếu chỉ key theo code, fit sẽ chạy nhầm với ranh giới cũ rồi bỏ qua lần fit đúng khi ranh giới mới về.
  useEffect(() => {
    if (!enabled) return;

    const rings = wardCode && wardPolygons.length ? wardPolygons : provincePolygons;
    if (!rings.length) return;

    const pointCount = rings.reduce((sum, ring) => sum + ring.length, 0);
    const boundaryKey = wardCode
      ? `ward:${wardCode}:${pointCount}`
      : provinceCode
        ? `province:${provinceCode}:${pointCount}`
        : null;
    if (!boundaryKey || lastBoundaryKeyRef.current === boundaryKey) return;

    lastBoundaryKeyRef.current = boundaryKey;
    // MapView cần ít nhất 1 frame để render Polygon mới trước khi fitToCoordinates
    // đo đúng bounds — gọi ngay trong effect có thể fit hụt trên Android.
    const raf = requestAnimationFrame(() => {
      mapRef.current?.fitToCoordinates(rings.flat(), {
        edgePadding: MAP_EDGE_PADDING,
        animated: true,
      });
    });
    return () => cancelAnimationFrame(raf);
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

    const boundaryPrefix = wardCode ? `ward:${wardCode}:` : provinceCode ? `province:${provinceCode}:` : null;
    const boundaryUnchanged = boundaryPrefix != null && (lastBoundaryKeyRef.current?.startsWith(boundaryPrefix) ?? false);

    lastMarkerKeyRef.current = markerKey;

    if (boundaryUnchanged) {
      mapRef.current?.animateToRegion(
        { latitude: marker.latitude, longitude: marker.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 },
        350,
      );
    }
  }, [enabled, mapRef, marker, provinceCode, wardCode]);
}
