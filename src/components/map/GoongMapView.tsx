import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { ViewProps } from 'react-native';
import { Camera, Map, type CameraRef, type MapRef } from '@maplibre/maplibre-react-native';

import { getGoongStyleUrl } from '@/constants/map-config';

export interface LatLngRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Alias — cùng shape với `Region` của `react-native-maps` cũ, dùng để giảm diff khi port. */
export type Region = LatLngRegion;

/** latitudeDelta (độ vĩ) → zoom level xấp xỉ kiểu Google Maps, dùng để port `animateToRegion`. */
export function regionToZoom(latitudeDelta: number): number {
  return Math.max(2, Math.min(20, Math.log2(360 / Math.max(latitudeDelta, 1e-6))));
}

export interface GoongMapViewRef {
  /** Tương đương `MapView.animateToRegion` cũ — center + zoom suy từ latitudeDelta. */
  animateToRegion: (region: LatLngRegion, duration?: number) => void;
  /** Tương đương `MapView.fitToCoordinates` cũ. */
  fitToCoordinates: (
    coords: LatLng[],
    options?: { edgePadding?: { top?: number; right?: number; bottom?: number; left?: number }; animated?: boolean },
  ) => void;
  /** Camera imperative đầy đủ — dùng cho hiệu ứng cinematic (zoom/pitch/heading/orbit). */
  easeTo: (options: {
    center?: LatLng;
    zoom?: number;
    pitch?: number;
    bearing?: number;
    duration?: number;
  }) => void;
  getCamera: () => Promise<{ center: LatLng; zoom: number; pitch: number; bearing: number } | null>;
  /**
   * Xoay camera quanh `center` từ `fromBearing` → `toBearing` trong `duration`ms.
   * MapLibre Camera không có API "animate qua nhiều điểm dừng" như
   * `MapView.animateCamera` cũ — tự step bearing bằng `setInterval` (~60fps) và gọi
   * `jumpTo` (không animation riêng của layer dưới, tránh animation chồng animation).
   * Trả về hàm hủy — gọi khi cần dừng orbit giữa chừng (unmount, user tương tác).
   */
  orbit: (options: {
    center: LatLng;
    zoom: number;
    pitch: number;
    fromBearing: number;
    toBearing: number;
    duration: number;
    onDone?: () => void;
  }) => () => void;
}

interface GoongMapViewProps extends Omit<ViewProps, 'style'> {
  style?: ViewProps['style'];
  initialRegion?: LatLngRegion;
  onPress?: () => void;
  /** Nhận toạ độ điểm vừa chạm — tương đương `onPress={(e) => e.nativeEvent.coordinate}` cũ. */
  onMapPress?: (coords: LatLng) => void;
  onPanDrag?: () => void;
  onRegionChangeComplete?: (region: LatLngRegion, details: { isGesture: boolean }) => void;
  children?: React.ReactNode;
  mapPadding?: { top: number; right: number; bottom: number; left: number };
}

/**
 * Wrapper base cho MapLibre + Goong style — expose ref API kiểu `react-native-maps` cũ
 * (`animateToRegion`, `fitToCoordinates`, `easeTo`, `getCamera`) để port các màn hình hiện có
 * mà không phải viết lại toàn bộ imperative camera logic từ đầu.
 */
export const GoongMapView = forwardRef<GoongMapViewRef, GoongMapViewProps>(function GoongMapView(
  { style, initialRegion, onPress, onMapPress, onPanDrag, onRegionChangeComplete, children, mapPadding, ...rest },
  ref,
) {
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const lastCenterRef = useRef<LatLng>(
    initialRegion
      ? { latitude: initialRegion.latitude, longitude: initialRegion.longitude }
      : { latitude: 0, longitude: 0 },
  );
  const lastZoomRef = useRef<number>(initialRegion ? regionToZoom(initialRegion.latitudeDelta) : 10);
  const lastPitchRef = useRef(0);
  const lastBearingRef = useRef(0);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration = 500) => {
      cameraRef.current?.easeTo({
        center: [region.longitude, region.latitude],
        zoom: regionToZoom(region.latitudeDelta),
        duration,
      });
      lastCenterRef.current = { latitude: region.latitude, longitude: region.longitude };
      lastZoomRef.current = regionToZoom(region.latitudeDelta);
    },
    fitToCoordinates: (coords, options) => {
      if (coords.length === 0) return;
      let west = coords[0].longitude;
      let east = coords[0].longitude;
      let south = coords[0].latitude;
      let north = coords[0].latitude;
      for (const c of coords) {
        west = Math.min(west, c.longitude);
        east = Math.max(east, c.longitude);
        south = Math.min(south, c.latitude);
        north = Math.max(north, c.latitude);
      }
      const pad = options?.edgePadding;
      cameraRef.current?.fitBounds([west, south, east, north], {
        padding: {
          top: pad?.top ?? 40,
          right: pad?.right ?? 40,
          bottom: pad?.bottom ?? 40,
          left: pad?.left ?? 40,
        },
        duration: options?.animated === false ? 0 : 500,
      });
    },
    easeTo: ({ center, zoom, pitch, bearing, duration = 500 }) => {
      const targetCenter = center ?? lastCenterRef.current;
      cameraRef.current?.easeTo({
        center: [targetCenter.longitude, targetCenter.latitude],
        zoom,
        pitch,
        bearing,
        duration,
      });
      if (center) lastCenterRef.current = center;
      if (zoom != null) lastZoomRef.current = zoom;
      if (pitch != null) lastPitchRef.current = pitch;
      if (bearing != null) lastBearingRef.current = bearing;
    },
    getCamera: async () => {
      if (!mapRef.current) return null;
      const [center, zoom, pitch, bearing] = await Promise.all([
        mapRef.current.getCenter(),
        mapRef.current.getZoom(),
        mapRef.current.getPitch(),
        mapRef.current.getBearing(),
      ]);
      return { center: { latitude: center[1], longitude: center[0] }, zoom, pitch, bearing };
    },
    orbit: ({ center, zoom, pitch, fromBearing, toBearing, duration, onDone }) => {
      const stepMs = 1000 / 60;
      const steps = Math.max(1, Math.round(duration / stepMs));
      const centerTuple: [number, number] = [center.longitude, center.latitude];
      let step = 0;

      const intervalId = setInterval(() => {
        step += 1;
        const t = Math.min(1, step / steps);
        const bearing = fromBearing + (toBearing - fromBearing) * t;
        cameraRef.current?.jumpTo({ center: centerTuple, zoom, pitch, bearing });
        if (t >= 1) {
          clearInterval(intervalId);
          lastBearingRef.current = toBearing;
          onDone?.();
        }
      }, stepMs);

      lastCenterRef.current = center;
      lastZoomRef.current = zoom;
      lastPitchRef.current = pitch;

      return () => clearInterval(intervalId);
    },
  }));

  return (
    <Map
      ref={mapRef}
      style={style ?? { flex: 1 }}
      mapStyle={getGoongStyleUrl()}
      contentInset={mapPadding}
      onPress={
        onPress || onMapPress
          ? (event) => {
              onPress?.();
              if (onMapPress) {
                const [lng, lat] = event.nativeEvent.lngLat;
                onMapPress({ latitude: lat, longitude: lng });
              }
            }
          : undefined
      }
      onRegionWillChange={onPanDrag ? () => onPanDrag() : undefined}
      onRegionDidChange={
        onRegionChangeComplete
          ? (event) => {
              const { center, zoom, userInteraction } = event.nativeEvent;
              const latitudeDelta = 360 / 2 ** zoom;
              onRegionChangeComplete(
                {
                  latitude: center[1],
                  longitude: center[0],
                  latitudeDelta,
                  longitudeDelta: latitudeDelta,
                },
                { isGesture: userInteraction },
              );
            }
          : undefined
      }
      {...rest}
    >
      <Camera
        ref={cameraRef}
        initialViewState={
          initialRegion
            ? {
                center: [initialRegion.longitude, initialRegion.latitude],
                zoom: regionToZoom(initialRegion.latitudeDelta),
              }
            : undefined
        }
      />
      {children}
    </Map>
  );
});
