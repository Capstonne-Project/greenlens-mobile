import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { AppNotification } from '@/types/notification.types';
import {
  formatNotificationDisplay,
  formatNotificationTime,
  getNotificationMeta,
} from '@/utils/notification-meta';

interface NotificationListItemProps {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
  /** Ẩn divider dưới cùng section */
  showDivider?: boolean;
}

export function NotificationListItem({
  item,
  onPress,
  showDivider = true,
}: NotificationListItemProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const meta = getNotificationMeta(item.type);
  const timeLabel = formatNotificationTime(item.createdAt);
  const { title, message } = formatNotificationDisplay(item);
  const showThumb = meta.isReportLinked && !!item.thumbnailUrl;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onPress(item)}
        onPressIn={() => {
          scale.value = withSpring(0.985, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 320 });
        }}
        className="flex-row items-center px-4 py-3.5"
        style={{
          backgroundColor: item.isRead ? colors.white : '#FAFFFE',
        }}
      >
        {/* Unread dot */}
        <View className="mr-2 w-2 items-center">
          {!item.isRead ? (
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
          ) : null}
        </View>

        {/* Report thumb đứng (portrait) OR icon viền xanh */}
        {showThumb ? (
          <Image
            source={{ uri: item.thumbnailUrl! }}
            style={{ width: 52, height: 72, borderRadius: 10, marginRight: 12 }}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View
            className="mr-3 h-11 w-11 items-center justify-center rounded-full border-2 bg-transparent"
            style={{ borderColor: colors.primary }}
          >
            <Ionicons name={meta.icon} size={20} color={colors.primary} />
          </View>
        )}

        <View className="min-w-0 flex-1">
          <Text className="text-[14px] leading-5 text-textPrimary" numberOfLines={2}>
            <Text className="font-bold" style={{ color: colors.primary }}>
              {title}
            </Text>
            {message ? (
              <Text className="font-normal text-textPrimary">
                {' '}
                {message}
              </Text>
            ) : null}
          </Text>
          <Text className="mt-1 text-[11px] text-textSecondary" numberOfLines={1}>
            {meta.categoryLabel}
            {timeLabel ? ` · ${timeLabel}` : ''}
          </Text>
        </View>
      </Pressable>

      {showDivider ? <View className="ml-[66px] h-px bg-border/70" /> : null}
    </Animated.View>
  );
}
