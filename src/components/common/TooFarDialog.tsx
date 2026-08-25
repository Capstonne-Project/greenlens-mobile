import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { goongService } from '@/services/goong.service';
import { colors } from '@/theme/colors';
import { formatDistance } from '@/utils/geo';

interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface TooFarDialogProps {
  visible: boolean;
  distanceMeters: number | null;
  photoLocation?: GeoPoint | null;
  targetLocation?: GeoPoint | null;
  onClose: () => void;
}

/** Chặn cứng khi vị trí GPS lúc chụp/nộp ảnh tiến độ quá xa vị trí điểm rác — không cho override. */
export function TooFarDialog({
  visible,
  distanceMeters,
  photoLocation,
  targetLocation,
  onClose,
}: TooFarDialogProps) {
  const insets = useSafeAreaInsets();
  const [routePath, setRoutePath] = useState<GeoPoint[] | null>(null);

  useEffect(() => {
    if (!visible || !photoLocation || !targetLocation) {
      setRoutePath(null);
      return;
    }
    let cancelled = false;
    goongService
      .getWalkingDirections(photoLocation, targetLocation)
      .then((result) => {
        if (!cancelled) setRoutePath(result?.path ?? null);
      })
      .catch(() => {
        if (!cancelled) setRoutePath(null);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, photoLocation, targetLocation]);

  const mapRegion = useMemo(() => {
    if (!photoLocation || !targetLocation) return null;
    const latitude = (photoLocation.latitude + targetLocation.latitude) / 2;
    const longitude = (photoLocation.longitude + targetLocation.longitude) / 2;
    const latitudeDelta = Math.max(Math.abs(photoLocation.latitude - targetLocation.latitude) * 2.2, 0.006);
    const longitudeDelta = Math.max(Math.abs(photoLocation.longitude - targetLocation.longitude) * 2.2, 0.006);
    return { latitude, longitude, latitudeDelta, longitudeDelta };
  }, [photoLocation, targetLocation]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View
          className="rounded-t-2xl bg-white px-4 pt-2"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>

          <View className="mb-3 flex-row items-start gap-3">
            <Ionicons name="warning-outline" size={24} color="#B45309" />
            <View className="flex-1">
              <Text className="text-base font-bold text-textPrimary">
                Ảnh không được chụp tại vị trí điểm rác
              </Text>
              <Text className="mt-1 text-sm leading-5 text-textSecondary">
                {distanceMeters !== null
                  ? `Vị trí chụp ảnh cách vị trí điểm rác khoảng ${distanceMeters}m. Vui lòng chụp lại ảnh tại đúng vị trí để nộp tiến độ.`
                  : 'Vị trí chụp ảnh cách vị trí điểm rác quá xa. Vui lòng chụp lại ảnh tại đúng vị trí để nộp tiến độ.'}
              </Text>
            </View>
          </View>

          {mapRegion && photoLocation && targetLocation ? (
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
                <Marker coordinate={photoLocation} title="Vị trí chụp ảnh" pinColor={colors.error} />
                <Marker coordinate={targetLocation} title="Vị trí điểm rác" pinColor={colors.primary} />
                <Polyline
                  coordinates={routePath ?? [photoLocation, targetLocation]}
                  strokeColor={colors.error}
                  strokeWidth={3}
                  lineDashPattern={routePath ? undefined : [6, 4]}
                />
              </MapView>
              <View className="absolute bottom-1.5 right-1.5 rounded-full bg-white/95 px-2.5 py-1" style={{ elevation: 2 }}>
                <Text className="text-[11px] font-bold" style={{ color: colors.error }}>
                  Cách {distanceMeters !== null ? formatDistance(distanceMeters / 1000) : '?'}
                </Text>
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={onClose}
            className="items-center justify-center rounded-xl"
            style={{ height: 48, backgroundColor: colors.primary }}
          >
            <Text className="font-bold text-white">Đã hiểu</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
