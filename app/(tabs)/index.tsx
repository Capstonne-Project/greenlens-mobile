import { CategoryFilterChips, type CategoryFilterId } from '@/components/map/CategoryFilterChips';

import { AreaSummaryBottomPanel } from '@/components/map/AreaSummaryBottomPanel';

import { CitizenHomeHeader } from '@/components/map/CitizenHomeHeader';

import { CitizenMapPinMarker } from '@/components/map/CitizenMapPinMarker';

import { CitizenMapToolbar } from '@/components/map/CitizenMapToolbar';

import {

  CITIZEN_MAP_LAYERS,

  DEFAULT_CITIZEN_MAP_LAYER_ID,

  getCitizenMapLayerById,

  type CitizenMapLayerId,

} from '@/constants/map-layers';

import { HCM_INITIAL_REGION } from '@/constants/map-region';

import type { CitizenMapPin } from '@/data/citizen-map-mock';

import { usePollutionCategories } from '@/hooks/usePollutionCategories';

import { useUserMapLocation } from '@/hooks/useUserMapLocation';

import { useViewportMapReports } from '@/hooks/useViewportMapReports';

import { useRouter, type Href } from 'expo-router';

import { useCallback, useRef, useState } from 'react';

import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';

import MapView from 'react-native-maps';

import { useSafeAreaInsets } from 'react-native-safe-area-context';



/** Trang chủ citizen — `react-native-maps` (MapKit / Google Maps), chạy được trên Expo Go. */

export default function CitizenHomeScreen() {

  const insets = useSafeAreaInsets();

  const router = useRouter();

  const mapRef = useRef<MapView | null>(null);

  const [filter, setFilter] = useState<CategoryFilterId>('all');

  const [selected, setSelected] = useState<CitizenMapPin | null>(null);

  const [mapLayerId, setMapLayerId] = useState<CitizenMapLayerId>(DEFAULT_CITIZEN_MAP_LAYER_ID);

  const [followUserLocation, setFollowUserLocation] = useState(false);



  const {

    canShowUserLocation,

    location: userLocation,

    isLocating,

    permissionDenied,

    ensurePermission,

    refreshLocation,

    toRegion,

  } = useUserMapLocation();



  const { pins: visiblePins, rawCount, isLoading, errorMessage, onRegionChangeComplete } =

    useViewportMapReports(filter);

  const { categories } = usePollutionCategories();



  const activeMapLayer = getCitizenMapLayerById(mapLayerId);



  const onMapPress = useCallback(() => {

    setSelected(null);

    setFollowUserLocation(false);

  }, []);



  const onMarkerPress = useCallback((pin: CitizenMapPin) => {

    setSelected((prev) => (prev?.id === pin.id ? null : pin));

  }, []);



  const onOpenReportDetail = useCallback((pin: CitizenMapPin) => {

    Alert.alert('Chi tiết', `Mở báo cáo ${pin.id} — nối route sau.`);

  }, []);



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



  const zoomIn = useCallback(() => {

    const base = userLocation && followUserLocation ? toRegion(userLocation) : HCM_INITIAL_REGION;

    mapRef.current?.animateToRegion(

      {

        ...base,

        latitudeDelta: base.latitudeDelta * 0.6,

        longitudeDelta: base.longitudeDelta * 0.6,

      },

      400

    );

  }, [followUserLocation, toRegion, userLocation]);



  if (Platform.OS === 'web') {

    return (

      <View className="flex-1 items-center justify-center bg-white px-6">

        <Text className="text-center text-base text-textSecondary">

          Bản đồ native (`react-native-maps`) hiện không được cấu hình cho web trong project này. Dùng iOS /

          Android hoặc Expo Go trên thiết bị.

        </Text>

      </View>

    );

  }



  return (

    <View className="flex-1 bg-white">

      <MapView

        ref={mapRef}

        style={{ flex: 1 }}

        initialRegion={HCM_INITIAL_REGION}

        mapType={activeMapLayer.mapType}

        showsUserLocation={canShowUserLocation}

        showsMyLocationButton={false}

        followsUserLocation={followUserLocation}

        onPress={onMapPress}

        onMarkerPress={(event) => {

          const { latitude, longitude } = event.nativeEvent.coordinate;

          const pin = visiblePins.find(

            (item) =>

              Math.abs(item.latitude - latitude) < 1e-5 && Math.abs(item.longitude - longitude) < 1e-5

          );

          if (pin) onMarkerPress(pin);

        }}

        onRegionChangeComplete={(region, details) => {

          if (details?.isGesture) {

            setFollowUserLocation(false);

          }

          onRegionChangeComplete(region);

        }}

      >

        {visiblePins.map((pin) => (

          <CitizenMapPinMarker

            key={pin.id}

            pin={pin}

            selected={selected?.id === pin.id}

            onPress={onMarkerPress}

            onOpenDetail={onOpenReportDetail}

          />

        ))}

      </MapView>



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

        <CitizenHomeHeader

          onMenuPress={() => Alert.alert('Menu', 'Menu bên sẽ được bổ sung sau.')}

          onProfilePress={() => router.push('/(tabs)/profile' as Href)}

        />

        <CategoryFilterChips selected={filter} categories={categories} onChange={setFilter} />

      </View>



      <CitizenMapToolbar

        onLayers={onChooseMapLayer}

        onLocate={onLocateMe}

        onFilters={() => Alert.alert('Bộ lọc', 'Lọc nâng cao — sắp có.')}

        onZoomIn={zoomIn}

        layersActive={mapLayerId !== DEFAULT_CITIZEN_MAP_LAYER_ID}

        locateActive={canShowUserLocation && followUserLocation}

      />



      <AreaSummaryBottomPanel

        areaTitle="Khu vực đang xem"

        reportCount={rawCount}

        onSeeAll={() => router.push('/(tabs)/reports' as Href)}

      />

    </View>

  );

}


