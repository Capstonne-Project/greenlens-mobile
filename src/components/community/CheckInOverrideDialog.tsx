import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteMiniMap } from '@/components/map/RouteMiniMap';
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

  const scrollRef = useRef<ScrollView>(null);
  // Cuộn ScrollView bên trong sheet để ô lý do luôn nổi trên bàn phím — sheet không có
  // nhiều chỗ trống dự phòng như màn hình toàn trang nên cần chủ động cuộn khi focus.
  const scrollToInput: NonNullable<TextInputProps['onFocus']> = (event) => {
    const target = event.currentTarget;
    setTimeout(() => {
      target.measureInWindow((_x, y, _w, height) => {
        const KEYBOARD_ESTIMATE = 300;
        const screenHeight = Dimensions.get('window').height;
        const visibleBottom = screenHeight - KEYBOARD_ESTIMATE;
        const inputBottom = y + height;
        if (inputBottom > visibleBottom) {
          scrollRef.current?.scrollTo({ y: inputBottom - visibleBottom + 24, animated: true });
        }
      });
    }, 200);
  };

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
          style={{ paddingBottom: insets.bottom + 16, maxHeight: '90%' }}
        >
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>

          <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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

          {userLocation && targetLocation ? (
            <View className="mb-3">
              <RouteMiniMap
                origin={userLocation}
                destination={targetLocation}
                routePath={routePath}
                originColor={colors.error}
                destinationColor={colors.primary}
                routeColor={colors.error}
              />
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
            onFocus={scrollToInput}
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
          </ScrollView>

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
