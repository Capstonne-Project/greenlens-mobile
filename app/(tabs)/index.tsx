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
import { AreaDimMask } from '@/components/map/AreaDimMask';
import { AreaFocusChip } from '@/components/map/AreaFocusChip';
import { GoongMapView, regionToZoom, type GoongMapViewRef, type LatLng, type Region } from '@/components/map/GoongMapView';
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
import { isPointInAnyPolygonGroup } from '@/utils/point-in-polygon';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';
import { UserLocation } from '@maplibre/maplibre-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Trang chủ citizen — MapLibre + Goong style. */

/** Padding đáy khi focus — khớp sheet card, để pin nằm giữa vùng map còn trống */
const FOCUS_MAP_BOTTOM_PADDING = 380;
const FOCUS_CAMERA_ZOOM = 17;
const FOCUS_CAMERA_PITCH = 55;

interface CameraSnapshot {
  center: LatLng;
  zoom: number;
  pitch: number;
  bearing: number;
}

export default function CitizenHomeScreen() {

  const insets = useSafeAreaInsets();

  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const mapRef = useRef<GoongMapViewRef | null>(null);
  const pitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orbitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orbitCancelRef = useRef<(() => void) | null>(null);
  const isCinematicRef = useRef(false);
  const pressTokenRef = useRef(0);
  /** Region/camera trước khi focus pin — restore khi xóa focus (map + list khớp nhau) */
  const lastInteractiveRegionRef = useRef<Region>(HCM_INITIAL_REGION);
  const preFocusRegionRef = useRef<Region | null>(null);
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

    toRegion,

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
        mapRef.current?.fitToCoordinates(coords, {
          // bottom lớn vì DraggableReportsSheet che phần dưới map
          edgePadding: { top: 140, right: 60, bottom: 340, left: 60 },
          animated: true,
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



  const clearCameraAnimations = useCallback(() => {
    if (pitchTimerRef.current) {
      clearTimeout(pitchTimerRef.current);
      pitchTimerRef.current = null;
    }
    if (orbitTimerRef.current) {
      clearTimeout(orbitTimerRef.current);
      orbitTimerRef.current = null;
    }
    if (orbitCancelRef.current) {
      orbitCancelRef.current();
      orbitCancelRef.current = null;
    }
    isCinematicRef.current = false;
  }, []);

  useEffect(() => clearCameraAnimations, [clearCameraAnimations]);

  const exitFocusCamera = useCallback(() => {
    clearCameraAnimations();
    const restoreRegion = preFocusRegionRef.current ?? lastInteractiveRegionRef.current;
    const restoreCamera = preFocusCameraRef.current;
    preFocusRegionRef.current = null;
    preFocusCameraRef.current = null;

    // Giữ chặn native onRegionChangeComplete trong lúc animate restore (420ms) — nếu không,
    // sự kiện native bắn ra khi animation xong sẽ mang region suy từ zoom (lossy so với
    // latitudeDelta/longitudeDelta gốc), làm bboxCacheKey lệch và trigger fetch thừa
    // (đè mất pins đã fetch đúng cho toàn khu vực trước focus).
    isCinematicRef.current = true;

    // Một lệnh camera đầy đủ (center + zoom + pitch/bearing) — không gọi
    // easeTo({ pitch, bearing }) riêng vì sẽ giữ zoom focus → map 1 pin / list 8.
    if (restoreCamera?.center) {
      mapRef.current?.easeTo({
        center: restoreCamera.center,
        pitch: 0,
        bearing: 0,
        zoom: restoreCamera.zoom ?? regionToZoom(restoreRegion.latitudeDelta),
        duration: 420,
      });
    } else {
      mapRef.current?.animateToRegion(restoreRegion, 420);
    }

    lastInteractiveRegionRef.current = restoreRegion;
    onRegionChangeComplete(restoreRegion);

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
      mapRef.current?.easeTo({ pitch: 0, bearing: 0, duration: 350 });
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
      // Lưu region/camera trước cinematic — xóa focus restore đúng khung hình + list
      if (!preFocusRegionRef.current) {
        preFocusRegionRef.current = lastInteractiveRegionRef.current;
      }
      clearCameraAnimations();
      // Chặn refetch bbox trong lúc await/getCamera + animate zoom
      isCinematicRef.current = true;

      const token = ++pressTokenRef.current;
      const pinCenter = { latitude: pin.latitude, longitude: pin.longitude };

      // Khóa camera tại vị trí hiện tại ngay lập tức để hủy animation (pitch/orbit) đang
      // chạy dở — tránh 2 easeTo tranh chấp khi bấm marker liên tiếp.
      const currentCamera = await mapRef.current?.getCamera();
      if (token !== pressTokenRef.current) return; // đã có lần bấm marker mới hơn — bỏ qua
      if (currentCamera) {
        if (!preFocusCameraRef.current) {
          preFocusCameraRef.current = {
            center: currentCamera.center ?? pinCenter,
            pitch: 0,
            bearing: 0,
            zoom: currentCamera.zoom,
          };
        }
        mapRef.current?.easeTo({ ...currentCamera, duration: 0 });
      }

      const zoomDuration = 750;
      const zoomToPitchGap = 120;
      const pitchDuration = 600;
      const pitchToOrbitGap = 120;
      // 360° trọn vòng — orbit chạy bằng setInterval 60fps gọi jumpTo() qua JS bridge, kéo
      // càng dài càng dễ bị giật khi JS thread bận việc khác (fetch pins, render list). Giữ
      // ngắn (~4.5s) để nhịp đều tay hơn thay vì orbit 10s dễ khựng giữa chừng.
      const orbitDuration = 4500;

      // Luôn center đúng tọa độ pin — xoay quanh chấm, không lệch màn
      // (mapPadding đáy đẩy “tâm nhìn” lên trên sheet)
      mapRef.current?.easeTo({
        center: pinCenter,
        pitch: 0,
        bearing: 0,
        zoom: FOCUS_CAMERA_ZOOM,
        duration: zoomDuration,
      });

      pitchTimerRef.current = setTimeout(() => {
        pitchTimerRef.current = null;
        if (token !== pressTokenRef.current) return;
        mapRef.current?.easeTo({
          center: pinCenter,
          pitch: FOCUS_CAMERA_PITCH,
          bearing: 0,
          zoom: FOCUS_CAMERA_ZOOM,
          duration: pitchDuration,
        });

        pitchTimerRef.current = setTimeout(() => {
          pitchTimerRef.current = null;
          if (token !== pressTokenRef.current) return;

          // Orbit quanh pin: center cố định = chấm đỏ, xoay trọn 1 vòng 360°
          orbitCancelRef.current = mapRef.current?.orbit({
            center: pinCenter,
            zoom: FOCUS_CAMERA_ZOOM,
            pitch: FOCUS_CAMERA_PITCH,
            fromBearing: 0,
            toBearing: 360,
            duration: orbitDuration,
            onDone: () => {
              orbitCancelRef.current = null;
              orbitTimerRef.current = null;
              // Không refetch bbox zoom sát — giữ pins khu vực trước focus
              isCinematicRef.current = false;
            },
          }) ?? null;
        }, pitchDuration + pitchToOrbitGap);
      }, zoomDuration + zoomToPitchGap);
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

    mapRef.current?.animateToRegion(toRegion(coords), 500);

  }, [ensurePermission, refreshLocation, toRegion, userLocation]);



  if (Platform.OS === 'web') {

    return (

      <View className="flex-1 items-center justify-center bg-white px-6">

        <Text className="text-center text-base text-textSecondary">

          Bản đồ native (MapLibre) hiện không được cấu hình cho web trong project này. Dùng iOS /

          Android trên thiết bị.

        </Text>

      </View>

    );

  }



  return (

    <View className="flex-1 bg-white">

      <GoongMapView

        ref={mapRef}

        style={{ flex: 1 }}

        initialRegion={HCM_INITIAL_REGION}

        mapPadding={
          selected
            ? { top: 0, right: 0, bottom: FOCUS_MAP_BOTTOM_PADDING, left: 0 }
            : { top: 0, right: 0, bottom: 0, left: 0 }
        }

        onPress={onMapPress}

        onPanDrag={() => {
          setFollowUserLocation(false);
          clearCameraAnimations();
        }}

        onRegionChangeComplete={(region) => {

          if (isCinematicRef.current) return;

          lastInteractiveRegionRef.current = region;
          onRegionChangeComplete(region);

        }}

      >

        {/*
          Luôn mount <UserLocation/> (không unmount theo canShowUserLocation) — component tự
          return null bên trong khi chưa có currentPosition. Unmount/mount có điều kiện ở đây
          từng đụng độ với setState dồn dập của useUserMapLocation/useViewportMapReports lúc
          mới mount màn hình, khiến Fabric nhận 2 mount batch chồng nhau trên cùng annotation
          layer và crash "View already has a parent" — xem comment tương tự bên dưới.
        */}
        <UserLocation />

        {/* Lớp mờ đã tự vẽ viền ranh giới — không thêm <Polygon> riêng, tránh viền đôi */}
        {areaFocus ? <AreaDimMask polygonGroups={areaFocus.polygonGroups} /> : null}

        {visiblePins.map((pin) => (
          <CitizenMapPinMarker
            key={pin.id}
            pin={pin}
            selected={selected?.id === pin.id}
            onPress={onMarkerPress}
          />
        ))}
      </GoongMapView>

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
        {/*
          Giữ cả 2 nhánh luôn mounted, chỉ ẩn/hiện bằng style (display/pointerEvents) thay vì
          unmount hẳn nhánh cũ khi `selected` đổi. Trước đây dùng `selected ? A : B` — khi bấm
          marker/bỏ chọn trong lúc camera đang cinematic (easeTo/orbit theo chuỗi setTimeout),
          React unmount toàn bộ CitizenHomeHeader/AreaFocusChip/CategoryFilterChips (nhiều
          ReactTextView) và mount nút "Xóa focus" trong cùng 1 frame. Fabric nhận 2 mount batch
          chồng nhau và cố addViewAt một view đã có parent → crash
          "IllegalStateException: View already has a parent".
        */}
        <View className="items-start" style={{ display: selected ? 'flex' : 'none' }} pointerEvents={selected ? 'box-none' : 'none'}>
          <TapScale onPress={onClearFocus}>
            <View
              className="rounded-full px-3.5 py-2.5 shadow-sm shadow-black/15"
              style={{ backgroundColor: colors.error }}
            >
              <Text className="text-sm font-semibold text-white">Xóa focus</Text>
            </View>
          </TapScale>
        </View>
        <View style={{ display: selected ? 'none' : 'flex' }} pointerEvents={selected ? 'none' : 'box-none'}>
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
        </View>
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


