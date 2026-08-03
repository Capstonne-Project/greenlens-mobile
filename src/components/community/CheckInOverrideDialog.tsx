import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { goongService } from '@/services/goong.service';
import { colors } from '@/theme/colors';
import { formatDistance, haversineKm } from '@/utils/geo';

const MIN_REASON = 20;

interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface CheckInOverrideDialogProps {
  visible: boolean;
  isSubmitting: boolean;
  userLocation: GeoPoint | null;
  targetLocation: GeoPoint | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

/** Draft BR-CMU-007 override: user is outside the 200m check-in radius but can still check
 * in by supplying a reason (≥ 20 chars), sent to the backend as `reason`. Shows a small map
 * with the user's position, the meeting/report point, the walking route between them
 * (Goong Directions, if available) and the straight-line distance. */
export function CheckInOverrideDialog({
  visible,
  isSubmitting,
  userLocation,
  targetLocation,
  onCancel,
  onConfirm,
}: CheckInOverrideDialogProps) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState('');
  const [routePath, setRoutePath] = useState<GeoPoint[] | null>(null);

  const reasonValid = reason.trim().length >= MIN_REASON;

  const distanceKm = useMemo(() => {
    if (!userLocation || !targetLocation) return null;
    return haversineKm(
      userLocation.latitude,
      userLocation.longitude,
      targetLocation.latitude,
      targetLocation.longitude,
    );
  }, [userLocation, targetLocation]);

  const mapRegion = useMemo(() => {
    if (!userLocation || !targetLocation) return null;
    const latitude = (userLocation.latitude + targetLocation.latitude) / 2;
    const longitude = (userLocation.longitude + targetLocation.longitude) / 2;
    const latitudeDelta = Math.max(Math.abs(userLocation.latitude - targetLocation.latitude) * 2.2, 0.006);
    const longitudeDelta = Math.max(Math.abs(userLocation.longitude - targetLocation.longitude) * 2.2, 0.006);
    return { latitude, longitude, latitudeDelta, longitudeDelta };
  }, [userLocation, targetLocation]);

  useEffect(() => {
    if (!visible || !userLocation || !targetLocation) {
      setRoutePath(null);
      return;
    }
    let cancelled = false;
    goongService
      .getWalkingDirections(userLocation, targetLocation)
      .then((result) => {
        if (!cancelled) setRoutePath(result?.path ?? null);
      })
      .catch(() => {
        if (!cancelled) setRoutePath(null);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, userLocation, targetLocation]);

  const handleClose = () => {
    setReason('');
    onCancel();
  };

  const handleConfirm = () => {
    if (!reasonValid || isSubmitting) return;
    onConfirm(reason.trim());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end"
      >
        <Pressable className="absolute inset-0 bg-black/40" onPress={handleClose} />
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
              <Text className="text-base font-bold text-textPrimary">Bạn đang ở quá xa điểm tập trung</Text>
              <Text className="mt-1 text-sm leading-5 text-textSecondary">
                {distanceKm !== null
                  ? `Vị trí của bạn đang cách điểm tập trung khoảng ${formatDistance(distanceKm)}. Nhập lý do để vẫn check-in tại vị trí hiện tại.`
                  : 'Vị trí của bạn cách điểm tập trung hơn 200m. Nhập lý do để vẫn check-in tại vị trí hiện tại.'}
              </Text>
            </View>
          </View>

          {mapRegion && userLocation && targetLocation ? (
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
                <Marker coordinate={userLocation} title="Vị trí của bạn" pinColor={colors.error} />
                <Marker coordinate={targetLocation} title="Điểm tập trung" pinColor={colors.primary} />
                <Polyline
                  coordinates={routePath ?? [userLocation, targetLocation]}
                  strokeColor={colors.error}
                  strokeWidth={3}
                  lineDashPattern={routePath ? undefined : [6, 4]}
                />
              </MapView>
              <View className="absolute bottom-1.5 right-1.5 rounded-full bg-white/95 px-2.5 py-1" style={{ elevation: 2 }}>
                <Text className="text-[11px] font-bold" style={{ color: colors.error }}>
                  Cách {distanceKm !== null ? formatDistance(distanceKm) : '?'}
                </Text>
              </View>
            </View>
          ) : null}

          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Lý do check-in ngoài phạm vi (tối thiểu 20 ký tự)"
            placeholderTextColor={colors.textDisabled}
            multiline
            editable={!isSubmitting}
            className="rounded-xl border border-border px-3 py-2.5 text-sm text-textPrimary"
            style={{ minHeight: 88, textAlignVertical: 'top' }}
          />
          {reason.trim().length > 0 && !reasonValid ? (
            <Text className="mt-1 text-xs" style={{ color: colors.error }}>
              Tối thiểu {MIN_REASON} ký tự ({reason.trim().length}/{MIN_REASON})
            </Text>
          ) : null}

          <View className="mb-1 mt-4 flex-row gap-3">
            <Pressable
              onPress={handleClose}
              disabled={isSubmitting}
              className="flex-1 items-center justify-center rounded-xl border border-border"
              style={{ height: 48 }}
            >
              <Text className="font-semibold text-textSecondary">Hủy</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={!reasonValid || isSubmitting}
              className="flex-1 items-center justify-center rounded-xl"
              style={{ height: 48, backgroundColor: reasonValid ? colors.primary : colors.border }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  className="font-bold"
                  style={{ color: reasonValid ? '#fff' : colors.textDisabled }}
                >
                  Vẫn check-in
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
