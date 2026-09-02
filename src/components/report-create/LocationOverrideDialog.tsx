import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteMiniMap } from '@/components/map/RouteMiniMap';
import { Text } from '@/components/ui/text';
import { goongService } from '@/services/goong.service';
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
 * Chỉ cảnh báo — không chặn submit, quyết định cuối luôn thuộc về user (BE không thể verify vì
 * ảnh nén gửi lên R2 đã bị xoá EXIF). */
export function LocationOverrideDialog({
  visible,
  exifLocation,
  newLocation,
  onKeepNew,
  onRestoreExif,
}: LocationOverrideDialogProps) {
  const insets = useSafeAreaInsets();
  const [routePath, setRoutePath] = useState<GeoPoint[] | null>(null);

  useEffect(() => {
    if (!visible || !exifLocation || !newLocation) {
      setRoutePath(null);
      return;
    }
    let cancelled = false;
    goongService
      .getWalkingDirections(exifLocation, newLocation)
      .then((result) => {
        if (!cancelled) setRoutePath(result?.path ?? null);
      })
      .catch(() => {
        if (!cancelled) setRoutePath(null);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, exifLocation, newLocation]);

  const distanceKm = useMemo(() => {
    if (!exifLocation || !newLocation) return null;
    return haversineKm(
      exifLocation.latitude,
      exifLocation.longitude,
      newLocation.latitude,
      newLocation.longitude,
    );
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

          {exifLocation && newLocation ? (
            <View className="mb-3">
              <RouteMiniMap
                origin={exifLocation}
                destination={newLocation}
                routePath={routePath}
                originColor={colors.primary}
                destinationColor={colors.error}
                routeColor={colors.textSecondary}
              />
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
