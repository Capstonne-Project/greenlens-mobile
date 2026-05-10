import { CategoryFilterChips, type CategoryFilterId } from '@/components/map/CategoryFilterChips';
import { AreaSummaryBottomPanel } from '@/components/map/AreaSummaryBottomPanel';
import { CitizenHomeHeader } from '@/components/map/CitizenHomeHeader';
import { CitizenMapPinMarker } from '@/components/map/CitizenMapPinMarker';
import { CitizenMapToolbar } from '@/components/map/CitizenMapToolbar';
import { MapReportPreviewOverlay } from '@/components/map/MapReportPreviewOverlay';
import { HCM_INITIAL_REGION } from '@/constants/map-region';
import { CITIZEN_MAP_MOCK_PINS, type CitizenMapPin } from '@/data/citizen-map-mock';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import MapView, { Circle } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CitizenHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const [filter, setFilter] = useState<CategoryFilterId>('all');
  const [selected, setSelected] = useState<CitizenMapPin | null>(null);

  const visiblePins = useMemo(() => {
    if (filter === 'all') return CITIZEN_MAP_MOCK_PINS;
    return CITIZEN_MAP_MOCK_PINS.filter((p) => p.category === filter);
  }, [filter]);

  const onMapPress = useCallback(() => {
    setSelected(null);
  }, []);

  const onMarkerPress = useCallback((pin: CitizenMapPin) => {
    setSelected(pin);
  }, []);

  const recenter = useCallback(() => {
    mapRef.current?.animateToRegion(HCM_INITIAL_REGION, 500);
  }, []);

  const zoomIn = useCallback(() => {
    mapRef.current?.animateToRegion(
      {
        ...HCM_INITIAL_REGION,
        latitudeDelta: HCM_INITIAL_REGION.latitudeDelta * 0.6,
        longitudeDelta: HCM_INITIAL_REGION.longitudeDelta * 0.6,
      },
      400
    );
  }, []);

  return (
    <View className="flex-1 bg-white">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={HCM_INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={onMapPress}
        mapType="standard"
      >
        {visiblePins.map((pin) => (
          <Circle
            key={`heat-${pin.id}`}
            center={{ latitude: pin.latitude, longitude: pin.longitude }}
            radius={140}
            fillColor="rgba(245, 158, 11, 0.12)"
            strokeColor="rgba(245, 158, 11, 0.2)"
            strokeWidth={1}
          />
        ))}
        {visiblePins.map((pin) => (
          <CitizenMapPinMarker
            key={pin.id}
            pin={pin}
            selected={selected?.id === pin.id}
            onPress={onMarkerPress}
          />
        ))}
      </MapView>

      <View className="pointer-events-box-none absolute left-0 right-0 top-0 px-4" style={{ paddingTop: insets.top + 8 }}>
        <CitizenHomeHeader
          onMenuPress={() => Alert.alert('Menu', 'Menu bên sẽ được bổ sung sau.')}
          onProfilePress={() => router.push('/(tabs)/profile' as Href)}
        />
        <CategoryFilterChips selected={filter} onChange={setFilter} />
      </View>

      <CitizenMapToolbar
        onLayers={() => Alert.alert('Lớp bản đồ', 'Chọn lớp hiển thị — sắp có.')}
        onLocate={recenter}
        onFilters={() => Alert.alert('Bộ lọc', 'Lọc nâng cao — sắp có.')}
        onZoomIn={zoomIn}
      />

      {selected && (
        <MapReportPreviewOverlay
          pin={selected}
          onDismiss={() => setSelected(null)}
          onOpenDetail={() => Alert.alert('Chi tiết', `Mở báo cáo ${selected.id} — nối route sau.`)}
        />
      )}

      <AreaSummaryBottomPanel onSeeAll={() => router.push('/(tabs)/reports' as Href)} />
    </View>
  );
}
