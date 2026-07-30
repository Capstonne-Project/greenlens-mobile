import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { StaffCommunityPin } from '@/hooks/useStaffCommunityPins';
import type { CommunityCleanupStatus } from '@/types/community-cleanup.types';
import { formatDate } from '@/utils/formatters';

const STATUS_CONFIG: Record<CommunityCleanupStatus, { label: string; color: string; bg: string }> = {
  OpenForJoin: { label: 'Đang mở đăng ký', color: '#075985', bg: '#E0F2FE' },
  JoinClosed: { label: 'Đã đóng đăng ký', color: '#3730A3', bg: '#E0E7FF' },
  InProgress: { label: 'Đang dọn', color: '#5B21B6', bg: '#EDE9FE' },
  PendingVerification: { label: 'Chờ xác minh', color: '#86198F', bg: '#FAE8FF' },
  Completed: { label: 'Hoàn thành', color: '#065F46', bg: '#D1FAE5' },
  Cancelled: { label: 'Đã huỷ', color: '#374151', bg: '#F3F4F6' },
};

interface StaffCommunityCalloutCardProps {
  pin: StaffCommunityPin;
  onDismiss: () => void;
}

export function StaffCommunityCalloutCard({ pin, onDismiss }: StaffCommunityCalloutCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const status = STATUS_CONFIG[pin.status] ?? STATUS_CONFIG.OpenForJoin;
  const openDetail = () =>
    router.push({ pathname: '/community-lead/[id]', params: { id: pin.id } } as never);

  return (
    <Animated.View style={[animStyle, { marginHorizontal: 16 }]}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
        onPress={openDetail}
      >
        <View
          className="overflow-hidden rounded-2xl bg-white"
          style={{
            elevation: 8,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {pin.thumbnailUrl ? (
            <Image
              source={{ uri: pin.thumbnailUrl }}
              style={{ width: '100%', height: 148 }}
              contentFit="cover"
            />
          ) : (
            <View
              className="w-full items-center justify-center"
              style={{ height: 100, backgroundColor: status.bg }}
            >
              <Ionicons name="people" size={36} color={status.color} />
            </View>
          )}

          <View className="p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <Ionicons name="people" size={13} color={colors.textSecondary} />
              <Text className="text-xs text-textSecondary">Chương trình cộng đồng</Text>
              <View className="flex-1" />
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: status.bg }}>
                <Text className="text-[11px] font-semibold" style={{ color: status.color }}>
                  {status.label}
                </Text>
              </View>
            </View>

            <Text className="mb-1.5 text-base font-bold text-textPrimary" numberOfLines={2}>
              {pin.title}
            </Text>

            <View className="mb-1 flex-row items-center gap-3">
              <View className="flex-row items-center gap-1">
                <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
                <Text className="text-xs text-textSecondary">
                  {pin.participantCount}/{pin.maxParticipants} người
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                <Text className="text-xs text-textSecondary">{formatDate(pin.startsAt)}</Text>
              </View>
            </View>

            {/* Thanh tiến độ */}
            <View className="mb-3 mt-2">
              <View className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: colors.border }}>
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, pin.progressPercent))}%`,
                    backgroundColor: pin.color,
                  }}
                />
              </View>
              <Text className="mt-1 text-[11px] text-textSecondary">
                Tiến độ {pin.progressPercent}%
              </Text>
            </View>

            <View className="flex-row gap-2">
              <Pressable
                onPress={onDismiss}
                className="flex-1 items-center rounded-xl border border-border py-2.5"
              >
                <Text className="text-sm font-semibold text-textSecondary">Đóng</Text>
              </Pressable>
              <Pressable
                onPress={openDetail}
                className="flex-1 items-center rounded-xl py-2.5"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-sm font-bold text-white">Quản lý</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
