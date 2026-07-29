import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useNotificationStore } from '@/stores/notification.store';
import { colors } from '@/theme/colors';

interface NotificationBellProps {
  /** Màu icon — dùng khi đặt trên nền tối/ảnh (vd header trong suốt trên map). */
  color?: string;
  size?: number;
}

/**
 * Icon thông báo + badge unread cho header (góc phải).
 * Thay cho tab "Thông báo" trong bottom nav của citizen.
 */
export function NotificationBell({
  color = colors.textPrimary,
  size = 24,
}: NotificationBellProps) {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'
        }
        hitSlop={10}
        onPress={() => router.push('/(tabs)/notifications' as never)}
        onPressIn={() => {
          scale.value = withSpring(0.9, { damping: 16, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 300 });
        }}
        className="relative h-10 w-10 items-center justify-center"
      >
        <Ionicons name="notifications-outline" size={size} color={color} />
        {unreadCount > 0 ? (
          <View
            className="absolute min-w-[16px] items-center justify-center rounded-full border-2 border-white px-1"
            style={{ height: 16, top: 4, right: 4, backgroundColor: colors.error }}
          >
            <Text className="text-[9px] font-bold leading-[10px] text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
