import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  InspectionMapListCard,
  InspectionMapPinMarker,
  MapLegend,
} from '@/components/inspection';
import { Text } from '@/components/ui/text';
import { useInspectionQueue } from '@/hooks/useInspectionQueue';
import { useUserMapLocation } from '@/hooks/useUserMapLocation';
import { colors } from '@/theme/colors';
import type { InspectionQueueItem } from '@/types/inspection.types';
import { haversineKm } from '@/utils/geo';
import { openGoogleMapsDirections } from '@/utils/open-directions';

const MAP_PAGE_SIZE = 100;

/** TP.HCM — fallback khi chưa có GPS và chưa có pin nào. */
const FALLBACK_REGION: Region = {
  latitude: 10.7769,
  longitude: 106.7009,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const FOCUS_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 } as const;

export default function InspectorMapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { items, isLoading, errorMessage, refetch } = useInspectionQueue({
    pageSize: MAP_PAGE_SIZE,
  });
  const { location, canShowUserLocation, ensurePermission, refreshLocation, toRegion } =
    useUserMapLocation();

  // Chỉ hiện hồ sơ còn phải xử lý ngoài hiện trường + có toạ độ hợp lệ.
  const pins = useMemo(
    () =>
      items.filter(
        (item) =>
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude) &&
          item.latitude !== 0 &&
          item.longitude !== 0,
      ),
    [items],
  );

  /** Sort theo khoảng cách để inspector lên lộ trình đi kiểm tra. */
  const sorted = useMemo(() => {
    const withDistance = pins.map((item) => ({
      item,
      distanceMeters: location
        ? haversineKm(location.latitude, location.longitude, item.latitude, item.longitude) * 1000
        : null,
    }));

    if (!location) {
      return withDistance.sort((a, b) =>
        (a.item.slaInspectionDueAt ?? '').localeCompare(b.item.slaInspectionDueAt ?? ''),
      );
    }
    return withDistance.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  }, [pins, location]);

  const initialRegion = useMemo<Region>(() => {
    if (location) return toRegion(location);
    if (pins[0]) {
      return {
        latitude: pins[0].latitude,
        longitude: pins[0].longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }
    return FALLBACK_REGION;
  }, [location, pins, toRegion]);

  const focusItem = useCallback((item: InspectionQueueItem) => {
    setSelectedId(item.id);
    mapRef.current?.animateToRegion(
      { latitude: item.latitude, longitude: item.longitude, ...FOCUS_DELTA },
      350,
    );
  }, []);

  const handleRecenter = useCallback(async () => {
    const granted = await ensurePermission();
    if (!granted) return;
    const coords = await refreshLocation();
    if (coords) mapRef.current?.animateToRegion(toRegion(coords), 400);
  }, [ensurePermission, refreshLocation, toRegion]);

  const handleNavigate = useCallback((item: InspectionQueueItem) => {
    void openGoogleMapsDirections(item.latitude, item.longitude, item.violatorName ?? item.address);
  }, []);

  const handleOpenDetail = useCallback((id: string) => {
    router.push(`/(inspector)/inspection/${id}` as Href);
  }, []);

  return (
    <View className="flex-1 bg-surface">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsUserLocation={canShowUserLocation}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={() => setSelectedId(null)}
      >
        {pins.map((item) => (
          <InspectionMapPinMarker
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            onPress={focusItem}
          />
        ))}
      </MapView>

      {/* Chú thích màu pin — nổi trên map */}
      <View className="absolute left-4" style={{ top: insets.top + 8 }}>
        <MapLegend />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Về vị trí của tôi"
        onPress={() => void handleRecenter()}
        className="absolute right-4 h-11 w-11 items-center justify-center rounded-full border border-border bg-white shadow-sm"
        style={{ top: insets.top + 8 }}
      >
        <Ionicons name="locate" size={20} color={colors.textPrimary} />
      </Pressable>

      {/* Danh sách đồng bộ với map */}
      <View
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-border bg-white"
        style={{ maxHeight: '46%' }}
      >
        <View className="items-center pt-2.5">
          <View className="h-1 w-10 rounded-full bg-border" />
        </View>

        <View className="flex-row items-center justify-between px-4 py-2.5">
          <Text className="text-sm font-bold text-textPrimary">
            {pins.length} hồ sơ trên bản đồ
          </Text>
          {location ? (
            <Text className="text-[11px] text-textSecondary">Gần nhất trước</Text>
          ) : (
            <Pressable onPress={() => void handleRecenter()} hitSlop={6}>
              <Text className="text-[11px] font-bold text-primary">Bật vị trí để sắp xếp</Text>
            </Pressable>
          )}
        </View>

        {errorMessage ? (
          <View className="mx-4 mb-3 rounded-xl bg-red-50 px-3 py-2.5">
            <Text className="text-xs text-error">{errorMessage}</Text>
            <Pressable onPress={() => void refetch()} hitSlop={6} className="mt-1.5">
              <Text className="text-xs font-bold text-primary">Thử lại</Text>
            </Pressable>
          </View>
        ) : null}

        <FlatList
          data={sorted}
          keyExtractor={(entry) => entry.item.id}
          renderItem={({ item: entry }) => (
            <InspectionMapListCard
              item={entry.item}
              distanceMeters={entry.distanceMeters}
              selected={entry.item.id === selectedId}
              onPress={focusItem}
              onOpenDetail={handleOpenDetail}
              onNavigate={handleNavigate}
            />
          )}
          ListEmptyComponent={
            <View className="items-center px-6 py-10">
              <Ionicons name="map-outline" size={36} color={colors.textDisabled} />
              <Text className="mt-2 text-center text-sm text-textSecondary">
                {isLoading ? 'Đang tải hồ sơ…' : 'Chưa có hồ sơ nào có toạ độ hiện trường.'}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
          removeClippedSubviews
          initialNumToRender={6}
        />
      </View>
    </View>
  );
}
