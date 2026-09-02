import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteMiniMap } from '@/components/map/RouteMiniMap';
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
  /** true khi BE (check-exif-location) trả shouldWarn=true — vị trí lệch vượt ngưỡng cho phép.
   * Ở chế độ này KHÔNG cho giữ vị trí mới, chỉ có nút "Đã hiểu" để giữ nguyên vị trí ảnh. */
  blocked?: boolean;
  /** Khoảng cách (m) từ BE — ưu tiên hiển thị số này thay vì tự tính lại bằng haversine. */
  distanceMeters?: number | null;
}

/** Ảnh có GPS EXIF nhưng user vừa đổi vị trí báo cáo sang chỗ khác (map/GPS thiết bị/tỉnh-phường).
 * Chế độ mặc định: hỏi user muốn giữ vị trí mới hay phục hồi vị trí gốc đã trích từ ảnh.
 * Chế độ `blocked`: lệch vượt ngưỡng hệ thống cho phép — không cho giữ vị trí mới. */
export function LocationOverrideDialog({
  visible,
  exifLocation,
  newLocation,
  onKeepNew,
  onRestoreExif,
  blocked = false,
  distanceMeters,
}: LocationOverrideDialogProps) {
  const insets = useSafeAreaInsets();

  const distanceKm = useMemo(() => {
    if (typeof distanceMeters === 'number') return distanceMeters / 1000;
    if (!exifLocation || !newLocation) return null;
    return haversineKm(
      exifLocation.latitude,
      exifLocation.longitude,
      newLocation.latitude,
      newLocation.longitude,
    );
  }, [distanceMeters, exifLocation, newLocation]);

  const dismiss = blocked ? onRestoreExif : onKeepNew;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={dismiss}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={dismiss} />
        <View
          className="rounded-t-2xl bg-white px-4 pt-2"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>

          <View className="mb-3 flex-row items-start gap-3">
            <Ionicons
              name={blocked ? 'alert-circle-outline' : 'location-outline'}
              size={24}
              color="#B45309"
            />
            <View className="flex-1">
              <Text className="text-base font-bold text-textPrimary">
                {blocked ? 'Không thể đổi vị trí' : 'Vị trí đã thay đổi'}
              </Text>
              <Text className="mt-1 text-sm leading-5 text-textSecondary">
                {blocked
                  ? `Vị trí bạn vừa chọn cách vị trí GPS trong ảnh khoảng ${
                      distanceKm !== null ? formatDistance(distanceKm) : '?'
                    }, vượt quá mức cho phép của hệ thống. Vui lòng giữ đúng vị trí của ảnh hoặc chụp lại ảnh tại vị trí mới.`
                  : distanceKm !== null
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
            {blocked ? (
              <Pressable
                onPress={onRestoreExif}
                className="items-center justify-center rounded-xl"
                style={{ height: 48, backgroundColor: colors.primary }}
              >
                <Text className="font-bold text-white">Đã hiểu, giữ vị trí của ảnh</Text>
              </Pressable>
            ) : (
              <>
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
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
