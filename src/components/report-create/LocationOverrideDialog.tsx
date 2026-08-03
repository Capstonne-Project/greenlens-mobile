import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Modal, Pressable, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { formatDistance, haversineKm } from '@/utils/geo';

interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface LocationOverrideDialogProps {
  visible: boolean;
  exifLocation: GeoPoint | null;
  newLocation: GeoPoint | null;
  onKeepNew: () => void;
  onRestoreExif: () => void;
}

/** Ảnh có GPS EXIF nhưng user vừa đổi vị trí báo cáo sang chỗ khác (map/GPS thiết bị/tỉnh-phường).
 * Hỏi user muốn giữ vị trí mới hay phục hồi vị trí gốc đã trích từ ảnh. */
export function LocationOverrideDialog({
  visible,
  exifLocation,
  newLocation,
  onKeepNew,
  onRestoreExif,
}: LocationOverrideDialogProps) {
  const insets = useSafeAreaInsets();

  const distanceKm = useMemo(() => {
    if (!exifLocation || !newLocation) return null;
    return haversineKm(
      exifLocation.latitude,
      exifLocation.longitude,
      newLocation.latitude,
      newLocation.longitude,
    );
  }, [exifLocation, newLocation]);

  const mapRegion = useMemo(() => {
    if (!exifLocation || !newLocation) return null;
    const latitude = (exifLocation.latitude + newLocation.latitude) / 2;
    const longitude = (exifLocation.longitude + newLocation.longitude) / 2;
    const latitudeDelta = Math.max(Math.abs(exifLocation.latitude - newLocation.latitude) * 2.2, 0.01);
    const longitudeDelta = Math.max(Math.abs(exifLocation.longitude - newLocation.longitude) * 2.2, 0.01);
    return { latitude, longitude, latitudeDelta, longitudeDelta };
  }, [exifLocation, newLocation]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onKeepNew}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onKeepNew} />
        <View
          className="rounded-t-2xl bg-white px-4 pt-2"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>

          <View className="mb-3 flex-row items-start gap-3">
            <Ionicons name="location-outline" size={24} color="#B45309" />
            <View className="flex-1">
              <Text className="text-base font-bold text-textPrimary">Vị trí đã thay đổi</Text>
              <Text className="mt-1 text-sm leading-5 text-textSecondary">
                {distanceKm !== null
                  ? `Ảnh này có vị trí GPS gốc, nhưng vị trí bạn vừa chọn cách đó khoảng ${formatDistance(distanceKm)}. Bạn muốn giữ vị trí mới hay phục hồi vị trí ban đầu của ảnh?`
                  : 'Ảnh này có vị trí GPS gốc khác với vị trí bạn vừa chọn. Bạn muốn giữ vị trí mới hay phục hồi vị trí ban đầu của ảnh?'}
              </Text>
            </View>
          </View>

          {mapRegion && exifLocation && newLocation ? (
            <View className="mb-3 overflow-hidden rounded-xl border border-border" style={{ height: 160 }}>
              <MapView
                style={{ flex: 1 }}
                region={mapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                showsUserLocation={false}
              >
                <Marker coordinate={exifLocation} title="Vị trí ảnh (EXIF)" pinColor={colors.primary} />
                <Marker coordinate={newLocation} title="Vị trí mới chọn" pinColor={colors.error} />
                <Polyline
                  coordinates={[exifLocation, newLocation]}
                  strokeColor={colors.textSecondary}
                  strokeWidth={2}
                  lineDashPattern={[6, 4]}
                />
              </MapView>
              <View className="absolute bottom-1.5 right-1.5 rounded-full bg-white/95 px-2.5 py-1" style={{ elevation: 2 }}>
                <Text className="text-[11px] font-bold" style={{ color: colors.error }}>
                  Cách {distanceKm !== null ? formatDistance(distanceKm) : '?'}
                </Text>
              </View>
            </View>
          ) : null}

          <View className="mb-1 mt-1 gap-3">
            <Pressable
              onPress={onKeepNew}
              className="items-center justify-center rounded-xl"
              style={{ height: 48, backgroundColor: colors.primary }}
            >
              <Text className="font-bold text-white">Vẫn tiếp tục với vị trí mới</Text>
            </Pressable>
            <Pressable
              onPress={onRestoreExif}
              className="items-center justify-center rounded-xl border border-border"
              style={{ height: 48 }}
            >
              <Text className="font-semibold text-textSecondary">Phục hồi vị trí ban đầu của ảnh</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
