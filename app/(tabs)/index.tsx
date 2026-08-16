import { CategoryFilterChips, type CategoryFilterId } from '@/components/map/CategoryFilterChips';
import { DraggableReportsSheet, REPORTS_SHEET_PEEK_HEIGHT, type SheetSnapPoint } from '@/components/map/DraggableReportsSheet';
import { CitizenHomeHeader } from '@/components/map/CitizenHomeHeader';
import { CitizenMapPinMarker } from '@/components/map/CitizenMapPinMarker';
import { CitizenMapToolbar } from '@/components/map/CitizenMapToolbar';
import {
  CITIZEN_MAP_LAYERS,
  DEFAULT_CITIZEN_MAP_LAYER_ID,
  getCitizenMapLayerById,
  type CitizenMapLayerId,
} from '@/constants/map-layers';
import { getGoongStyleUrl } from '@/constants/map-config';
import { AreaDimMask } from '@/components/map/AreaDimMask';
import { AreaFocusChip } from '@/components/map/AreaFocusChip';
import { PlaceSearchOverlay } from '@/components/map/PlaceSearchOverlay';
import { HCM_INITIAL_REGION } from '@/constants/map-region';
import type { CitizenMapPin } from '@/data/citizen-map-mock';
import { useAreaBoundary } from '@/hooks/useAreaBoundary';
import { usePlaceSearch } from '@/hooks/usePlaceSearch';
import { usePollutionCategories } from '@/hooks/usePollutionCategories';
import { useUserMapLocation } from '@/hooks/useUserMapLocation';
import { useViewportMapReports } from '@/hooks/useViewportMapReports';
import { useAuthStore } from '@/stores/auth.store';
import { TapScale } from '@/components/layout/TapScale';
import { colors } from '@/theme/colors';
import type { PlaceSuggestion } from '@/types/place-search.types';
import type { ReportSearchItem } from '@/types/report-search.types';
import type { ViewportBBox } from '@/types/map-viewport.types';
import { isPointInAnyPolygonGroup } from '@/utils/point-in-polygon';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';
import {
  Camera,
  Map as MapLibreMap,
  UserLocation,
  type CameraRef,
  type LngLat,
  type MapRef,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import type { NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Trang chủ citizen — MapLibre GL + style Goong Maptiles, đồng nhất iOS/Android. */

/** Padding đáy khi focus — khớp sheet card, để pin nằm giữa vùng map còn trống */
const FOCUS_MAP_BOTTOM_PADDING = 380;
const FOCUS_CAMERA_ZOOM = 17;

function latitudeDeltaToZoom(latitudeDelta: number): number {
  return Math.max(2, Math.min(20, Math.log2(360 / Math.max(latitudeDelta, 1e-6))));
}

interface CameraSnapshot {
  center: LngLat;
  zoom: number;
  pitch: number;
  heading: number;
}

function viewportToBBox(bounds: [west: number, south: number, east: number, north: number]): ViewportBBox {
  const [west, south, east, north] = bounds;
  return { minLat: south, maxLat: north, minLng: west, maxLng: east };
}

export default function CitizenHomeScreen() {
  const insets = useSafeAreaInsets();

  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const mapRef = useRef<MapRef | null>(null);
  const cameraRef = useRef<CameraRef | null>(null);
  const orbitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCinematicRef = useRef(false);
  const pressTokenRef = useRef(0);
  /** Center/zoom trước khi focus pin — restore khi xóa focus (map + list khớp nhau) */
  const lastInteractiveCenterRef = useRef<CameraSnapshot>({
    center: [HCM_INITIAL_REGION.longitude, HCM_INITIAL_REGION.latitude],
    zoom: latitudeDeltaToZoom(HCM_INITIAL_REGION.latitudeDelta),
    pitch: 0,
    heading: 0,
  });
  const preFocusCameraRef = useRef<CameraSnapshot | null>(null);

  const [filter, setFilter] = useState<CategoryFilterId>('all');

  const [selected, setSelected] = useState<CitizenMapPin | null>(null);

  const [mapLayerId, setMapLayerId] = useState<CitizenMapLayerId>(DEFAULT_CITIZEN_MAP_LAYER_ID);

  const [followUserLocation, setFollowUserLocation] = useState(false);

  const [sheetSnap, setSheetSnap] = useState<SheetSnapPoint>('mid');

  const {
    canShowUserLocation,
    location: userLocation,
    isLocating,
    permissionDenied,
    ensurePermission,
    refreshLocation,
    toCenter,
  } = useUserMapLocation();

  const { pins, isLoading, errorMessage, onRegionChangeComplete } =
    useViewportMapReports(filter, {
      onCategoryNotFound: () => setFilter('all'),
    });

  const { categories } = usePollutionCategories();

  // ── Search địa giới + focus vùng ──
  const [isSearchOpen, setSearchOpen] = useState(false);
  const placeSearch = usePlaceSearch();
  const {
    areaFocus,
    isLoading: isBoundaryLoading,
    hasNoBoundary,
    focusArea,
    clearFocus,
  } = useAreaBoundary();

  /** Chỉ hiện báo cáo nằm TRONG ranh giới vùng đã chọn (map và sheet dùng chung). */
  const visiblePins = useMemo(() => {
    if (!areaFocus || areaFocus.polygonGroups.length === 0) return pins;
    return pins.filter((pin) =>
      isPointInAnyPolygonGroup(areaFocus.polygonGroups, {
        latitude: pin.latitude,
        longitude: pin.longitude,
      }),
    );
  }, [pins, areaFocus]);

  const onSelectPlace = useCallback(
    async (suggestion: PlaceSuggestion) => {
      setSearchOpen(false);
      setSelected(null);

      const focus = await focusArea(suggestion);

      // Sau khi chọn tỉnh mới nạp phường của tỉnh đó — không thể tải hết ~10.000 phường.
      if (suggestion.kind === 'province') {
        void placeSearch.loadWardsFor(suggestion.provinceCode);
      }

      const coords = focus?.fitCoords ?? [];
      if (coords.length >= 2) {
        const lngs = coords.map((c) => c.longitude);
        const lats = coords.map((c) => c.latitude);
        const west = Math.min(...lngs);
        const east = Math.max(...lngs);
        const south = Math.min(...lats);
        const north = Math.max(...lats);
        // bottom lớn vì DraggableReportsSheet che phần dưới map
        cameraRef.current?.fitBounds([west, south, east, north], {
          padding: { top: 140, right: 60, bottom: 340, left: 60 },
          duration: 600,
        });
      }
    },
    [focusArea, placeSearch],
  );

  /** Chọn báo cáo từ kết quả search → mở thẳng chi tiết báo cáo đó. */
  const onSelectSearchedReport = useCallback(
    (report: ReportSearchItem) => {
      setSearchOpen(false);
      router.push({
        pathname: '/report/[id]',
        params: { id: report.id, source: 'map' },
      } as Href);
    },
    [router],
  );

  const activeMapLayer = getCitizenMapLayerById(mapLayerId);
  const styleUrl = getGoongStyleUrl(mapLayerId);

  const clearCameraAnimations = useCallback(() => {
    if (orbitTimerRef.current) {
      clearTimeout(orbitTimerRef.current);
      orbitTimerRef.current = null;
    }
    isCinematicRef.current = false;
  }, []);

  useEffect(() => clearCameraAnimations, [clearCameraAnimations]);

  const exitFocusCamera = useCallback(() => {
    clearCameraAnimations();
    const restore = preFocusCameraRef.current ?? lastInteractiveCenterRef.current;
    preFocusCameraRef.current = null;

    // Giữ chặn onRegionDidChange trong lúc animate restore (420ms) — nếu không, sự kiện
    // native bắn ra khi animation xong sẽ trigger fetch thừa (đè mất pins đã fetch đúng
    // cho toàn khu vực trước focus).
    isCinematicRef.current = true;

    cameraRef.current?.easeTo({
      center: restore.center,
      zoom: restore.zoom,
      pitch: 0,
      bearing: 0,
      duration: 420,
    });

    lastInteractiveCenterRef.current = { ...restore, pitch: 0, heading: 0 };
    const [lng, lat] = restore.center;
    const delta = 360 / Math.pow(2, restore.zoom);
    onRegionChangeComplete(
      viewportToBBox([lng - delta / 2, lat - delta / 2, lng + delta / 2, lat + delta / 2]),
    );

    const token = ++pressTokenRef.current;
    orbitTimerRef.current = setTimeout(() => {
      orbitTimerRef.current = null;
      if (token !== pressTokenRef.current) return;
      isCinematicRef.current = false;
    }, 420);
  }, [clearCameraAnimations, onRegionChangeComplete]);

  const onMapPress = useCallback(() => {
    const hadFocus = selected != null;
    setSelected(null);
    setFollowUserLocation(false);
    if (hadFocus) {
      exitFocusCamera();
    } else {
      clearCameraAnimations();
      cameraRef.current?.easeTo({
        center: lastInteractiveCenterRef.current.center,
        zoom: lastInteractiveCenterRef.current.zoom,
        pitch: 0,
        bearing: 0,
        duration: 350,
      });
    }
  }, [selected, exitFocusCamera, clearCameraAnimations]);

  const onClearFocus = useCallback(() => {
    setSelected(null);
    exitFocusCamera();
  }, [exitFocusCamera]);

  const onMarkerPress = useCallback(
    async (pin: CitizenMapPin) => {
      setSelected(pin);
      setFollowUserLocation(false);
      // Lưu center/zoom trước cinematic — xóa focus restore đúng khung hình + list
      if (!preFocusCameraRef.current) {
        preFocusCameraRef.current = lastInteractiveCenterRef.current;
      }
      clearCameraAnimations();
      // Chặn refetch bbox trong lúc animate zoom/pitch/orbit
      isCinematicRef.current = true;

      const token = ++pressTokenRef.current;
      const pinCenter: LngLat = [pin.longitude, pin.latitude];

      const zoomDuration = 750;
      const pitchDuration = 600;
      const orbitDuration = 3200;

      // Luôn center đúng tọa độ pin — xoay quanh chấm, không lệch màn
      // (padding đáy đẩy “tâm nhìn” lên trên sheet)
      await cameraRef.current?.easeTo({
        center: pinCenter,
        zoom: FOCUS_CAMERA_ZOOM,
        pitch: 0,
        bearing: 0,
        duration: zoomDuration,
      });
      if (token !== pressTokenRef.current) return;

      await cameraRef.current?.easeTo({
        center: pinCenter,
        zoom: FOCUS_CAMERA_ZOOM,
        pitch: 55,
        bearing: 0,
        duration: pitchDuration,
      });
      if (token !== pressTokenRef.current) return;

      // Orbit quanh pin: center cố định = chấm đỏ
      cameraRef.current?.easeTo({
        center: pinCenter,
        zoom: FOCUS_CAMERA_ZOOM,
        pitch: 55,
        bearing: 45,
        duration: orbitDuration,
      });

      orbitTimerRef.current = setTimeout(() => {
        orbitTimerRef.current = null;
        // Không refetch bbox zoom sát — giữ pins khu vực trước focus
        isCinematicRef.current = false;
      }, orbitDuration);
    },
    [clearCameraAnimations],
  );

  const onOpenReportDetail = useCallback(
    (pin: CitizenMapPin) => {
      if (!isAuthenticated) {
        router.push('/(auth)/login' as Href);
        return;
      }
      router.push({ pathname: '/report/[id]', params: { id: pin.id, source: 'map' } } as Href);
    },
    [isAuthenticated, router],
  );

  const onChooseMapLayer = useCallback(() => {
    Alert.alert(
      'Lớp bản đồ',
      `Đang dùng: ${activeMapLayer.label}`,
      [
        ...CITIZEN_MAP_LAYERS.map((layer) => ({
          text: layer.label,
          onPress: () => setMapLayerId(layer.id),
        })),
        { text: 'Đóng', style: 'cancel' as const },
      ],
      { cancelable: true }
    );
  }, [activeMapLayer.label]);

  const onLocateMe = useCallback(async () => {
    const granted = await ensurePermission();
    if (!granted) {
      Alert.alert(
        'Vị trí',
        'Bật quyền vị trí khi dùng app để hiển thị vị trí của bạn trên bản đồ.',
        [{ text: 'Đã hiểu' }]
      );
      return;
    }

    const coords = (await refreshLocation()) ?? userLocation;
    if (!coords) {
      Alert.alert('Vị trí', 'Không lấy được vị trí hiện tại. Thử lại sau.');
      return;
    }

    setFollowUserLocation(true);
    const { center, zoom } = toCenter(coords);
    cameraRef.current?.easeTo({ center, zoom, duration: 500 });
  }, [ensurePermission, refreshLocation, toCenter, userLocation]);

  const onRegionDidChange = useCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const { center, zoom, bounds, userInteraction } = event.nativeEvent;
      if (userInteraction) {
        setFollowUserLocation(false);
      }
      if (isCinematicRef.current) return;

      lastInteractiveCenterRef.current = { center, zoom, pitch: 0, heading: 0 };
      onRegionChangeComplete(viewportToBBox(bounds));
    },
    [onRegionChangeComplete],
  );

  if (Platform.OS === 'web' || !styleUrl) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-textSecondary">
          {Platform.OS === 'web'
            ? 'Bản đồ native (MapLibre) hiện không được cấu hình cho web trong project này. Dùng iOS / Android hoặc build dev-client.'
            : 'Chưa cấu hình EXPO_PUBLIC_GOONG_MAPTILES_KEY — bản đồ không hiển thị được.'}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <MapLibreMap
        ref={mapRef}
        style={{ flex: 1 }}
        mapStyle={styleUrl}
        onPress={onMapPress}
        onRegionDidChange={onRegionDidChange}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [HCM_INITIAL_REGION.longitude, HCM_INITIAL_REGION.latitude],
            zoom: latitudeDeltaToZoom(HCM_INITIAL_REGION.latitudeDelta),
          }}
          padding={
            selected
              ? { top: 0, right: 0, bottom: FOCUS_MAP_BOTTOM_PADDING, left: 0 }
              : { top: 0, right: 0, bottom: 0, left: 0 }
          }
        />

        {canShowUserLocation ? <UserLocation animated heading accuracy /> : null}

        {/* Lớp mờ đã tự vẽ viền ranh giới — không thêm fill riêng, tránh viền đôi */}
        {areaFocus ? <AreaDimMask polygonGroups={areaFocus.polygonGroups} /> : null}

        {visiblePins.map((pin) => (
          <CitizenMapPinMarker
            key={pin.id}
            pin={pin}
            selected={selected?.id === pin.id}
            onPress={onMarkerPress}
          />
        ))}
      </MapLibreMap>

      {(isLoading || isLocating) && (
        <View
          className="pointer-events-none absolute right-4 rounded-full bg-white/95 px-3 py-2 shadow-md"
          style={{ top: insets.top + 120 }}
        >
          <ActivityIndicator size="small" color="#059669" />
        </View>
      )}

      {errorMessage ? (
        <View className="pointer-events-none absolute bottom-[220px] left-4 right-4 rounded-xl bg-red-50 px-3 py-2">
          <Text className="text-center text-xs text-red-700">{errorMessage}</Text>
        </View>
      ) : null}

      {permissionDenied ? (
        <View className="pointer-events-none absolute bottom-[260px] left-4 right-4 rounded-xl bg-amber-50 px-3 py-2">
          <Text className="text-center text-xs text-amber-900">
            Chưa có quyền vị trí — bấm nút định vị để bật và hiện vị trí của bạn.
          </Text>
        </View>
      ) : null}

      <View className="pointer-events-box-none absolute left-0 right-0 top-0 px-4" style={{ paddingTop: insets.top + 8 }}>
        {selected ? (
          <View className="items-start">
            <TapScale onPress={onClearFocus}>
              <View
                className="rounded-full px-3.5 py-2.5 shadow-sm shadow-black/15"
                style={{ backgroundColor: colors.error }}
              >
                <Text className="text-sm font-semibold text-white">Xóa focus</Text>
              </View>
            </TapScale>
          </View>
        ) : (
          <>
            <CitizenHomeHeader
              onProfilePress={() => router.push('/(tabs)/profile' as Href)}
              onSearchPress={() => setSearchOpen(true)}
              activeAreaName={areaFocus?.name ?? null}
            />
            {areaFocus ? (
              <View className="mt-2.5">
                <AreaFocusChip
                  name={areaFocus.name}
                  reportCount={visiblePins.length}
                  isLoading={isBoundaryLoading}
                  hasNoBoundary={hasNoBoundary}
                  onClear={clearFocus}
                />
              </View>
            ) : null}
            <View className="mt-3">
              <CategoryFilterChips selected={filter} categories={categories} onChange={setFilter} />
            </View>
          </>
        )}
      </View>

      {sheetSnap !== 'full' ? (
        <CitizenMapToolbar
          onLayers={onChooseMapLayer}
          onLocate={onLocateMe}
          layersActive={mapLayerId !== DEFAULT_CITIZEN_MAP_LAYER_ID}
          locateActive={canShowUserLocation && followUserLocation}
          bottomOffset={REPORTS_SHEET_PEEK_HEIGHT + 16}
        />
      ) : null}

      <DraggableReportsSheet
        pins={visiblePins}
        focusedPin={selected}
        reportCount={visiblePins.length}
        isLoading={isLoading}
        onOpenDetail={onOpenReportDetail}
        onSnapChange={setSheetSnap}
        bottomInset={insets.bottom}
      />

      <PlaceSearchOverlay
        visible={isSearchOpen}
        search={placeSearch}
        onClose={() => setSearchOpen(false)}
        onSelect={onSelectPlace}
        onSelectReport={onSelectSearchedReport}
      />
    </View>
  );
}
