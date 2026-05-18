import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { StaffMapPin } from '@/hooks/useStaffMapPins';

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Low:      { label: 'Thấp',         color: '#166534', bg: '#DCFCE7' },
  Medium:   { label: 'Trung bình',   color: '#92400E', bg: '#FEF3C7' },
  High:     { label: 'Cao',          color: '#9A3412', bg: '#FFEDD5' },
  Critical: { label: 'Nghiêm trọng', color: '#991B1B', bg: '#FEE2E2' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Assigned:   { label: 'Mới giao',   color: '#1E40AF', bg: '#DBEAFE' },
  InProgress: { label: 'Đang xử lý', color: '#065F46', bg: '#D1FAE5' },
  Completed:  { label: 'Hoàn thành', color: '#374151', bg: '#F3F4F6' },
  Declined:   { label: 'Từ chối',    color: '#991B1B', bg: '#FEE2E2' },
};

interface StaffMapCalloutCardProps {
  pin: StaffMapPin;
  onDismiss: () => void;
}

export function StaffMapCalloutCard({ pin, onDismiss }: StaffMapCalloutCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const severity = SEVERITY_CONFIG[pin.severity] ?? SEVERITY_CONFIG.Medium;
  const status   = STATUS_CONFIG[pin.assignmentStatus] ?? STATUS_CONFIG.Assigned;

  return (
    <Animated.View style={[animStyle, { marginHorizontal: 16 }]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 16, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 280 }); }}
        onPress={() => router.push(`/assignment/${pin.reportId}` as never)}
      >
        <View
          className="overflow-hidden rounded-2xl bg-white"
          style={{ elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } }}
        >
          {/* Ảnh thumbnail */}
          {pin.firstImageUrl ? (
            <Image
              source={{ uri: pin.firstImageUrl }}
              style={{ width: '100%', height: 148 }}
              contentFit="cover"
            />
          ) : (
            <View
              className="w-full items-center justify-center"
              style={{ height: 100, backgroundColor: severity.bg }}
            >
              <Ionicons name="image-outline" size={36} color={severity.color} />
              <Text className="mt-1 text-xs" style={{ color: severity.color }}>{pin.categoryName}</Text>
            </View>
          )}

          <View className="p-4">
            {/* Code + badges */}
            <View className="mb-2 flex-row items-center gap-2">
              <Text className="text-xs text-textSecondary">{pin.reportCode}</Text>
              <View className="flex-1" />
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: severity.bg }}>
                <Text className="text-[11px] font-semibold" style={{ color: severity.color }}>{severity.label}</Text>
              </View>
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: status.bg }}>
                <Text className="text-[11px] font-semibold" style={{ color: status.color }}>{status.label}</Text>
              </View>
            </View>

            {/* Category */}
            <Text className="mb-1.5 text-base font-bold text-textPrimary" numberOfLines={1}>
              {pin.categoryName}
            </Text>

            {/* Address */}
            <View className="mb-3 flex-row items-start gap-1">
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-xs text-textSecondary" numberOfLines={2}>{pin.address}</Text>
            </View>

            {/* Actions */}
            <View className="flex-row gap-2">
              <Pressable
                onPress={onDismiss}
                className="flex-1 items-center rounded-xl border border-border py-2.5"
              >
                <Text className="text-sm font-semibold text-textSecondary">Đóng</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/assignment/${pin.reportId}` as never)}
                className="flex-1 items-center rounded-xl py-2.5"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-sm font-bold text-white">Xem chi tiết</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
