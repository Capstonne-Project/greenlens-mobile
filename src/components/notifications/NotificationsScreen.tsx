import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationListItem } from '@/components/notifications/NotificationListItem';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import {
  useNotifications,
  type NotificationsReadFilter,
} from '@/hooks/useNotifications';
import { colors } from '@/theme/colors';
import type { AppNotification } from '@/types/notification.types';
import {
  groupNotificationsByDay,
  type NotificationSection,
} from '@/utils/notification-meta';
import { resolveNotificationHref } from '@/utils/resolve-notification-href';

export type NotificationsShellVariant = 'citizen' | 'staff' | 'inspector';

interface NotificationsScreenProps {
  variant: NotificationsShellVariant;
  /** Show back button (staff/inspector opened from header). */
  showBack?: boolean;
}

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 3 },
}) as object;

const FILTER_TABS: { key: NotificationsReadFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unread', label: 'Chưa đọc' },
];

function SkeletonRow() {
  return (
    <View className="flex-row items-center px-4 py-3.5">
      <View className="mr-2 h-2 w-2 rounded-full bg-border" />
      <View className="mr-3 h-[72px] w-[52px] rounded-[10px] bg-surface" />
      <View className="flex-1 gap-2">
        <View className="h-3.5 w-4/5 rounded bg-border" />
        <View className="h-3 w-1/2 rounded bg-surface" />
      </View>
    </View>
  );
}

function FilterTab({
  label,
  count,
  isActive,
  onPress,
}: {
  label: string;
  count?: number;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
        className="relative mr-5 items-start pb-2.5"
      >
        <View className="flex-row items-center gap-1">
          <Text
            className="text-[14px]"
            style={{
              color: isActive ? colors.textPrimary : colors.textSecondary,
              fontWeight: isActive ? '700' : '500',
            }}
          >
            {label}
          </Text>
          {typeof count === 'number' && count > 0 ? (
            <Text
              className="text-[12px]"
              style={{
                color: isActive ? colors.primary : colors.textDisabled,
                fontWeight: isActive ? '700' : '500',
              }}
            >
              {count > 99 ? '99+' : count}
            </Text>
          ) : null}
        </View>
        {isActive ? (
          <View
            className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full"
            style={{ backgroundColor: colors.textPrimary }}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/** react-native-reusables — màn noti kiểu DailyUI / card trắng bo góc */
export function NotificationsScreen({
  variant,
  showBack = false,
}: NotificationsScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [filter, setFilter] = useState<NotificationsReadFilter>('all');

  const {
    items,
    unreadCount,
    isLoading,
    isRefreshing,
    isLoadingMore,
    errorMessage,
    refetch,
    loadMore,
    markAsRead,
    markAllRead,
  } = useNotifications({ enabled: true, filter });

  const sections = useMemo(() => groupNotificationsByDay(items), [items]);

  const handlePress = useCallback(
    async (item: AppNotification) => {
      if (!user?.role) return;

      await markAsRead(item.id);

      const href = resolveNotificationHref(item.type, item.referenceId, user.role);
      if (href) {
        router.push(href as Href);
      }
    },
    [markAsRead, user?.role],
  );

  const listEmpty = isLoading && items.length === 0;

  // `unreadCount` từ store có thể chưa đồng bộ (chưa fetch xong, hoặc BE trả 0 do lệch
  // trạng thái) — dựa thêm vào danh sách thực tế để nút không biến mất khi vẫn còn chưa đọc.
  const hasUnread = unreadCount > 0 || items.some((item) => !item.isRead);

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="px-5 pb-3 pt-3">
        <View className="mb-3 flex-row items-center justify-between">
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            {showBack ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                className="mr-1 h-9 w-9 items-center justify-center rounded-full bg-white"
              >
                <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              </Pressable>
            ) : null}
            <Text className="text-[28px] font-bold tracking-tight text-textPrimary">
              Thông báo
            </Text>
          </View>

          {hasUnread ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đánh dấu tất cả đã đọc"
              onPress={() => void markAllRead()}
              hitSlop={6}
              className="flex-row items-center gap-1.5 rounded-full px-3 py-2"
              style={{ backgroundColor: colors.primaryLight }}
            >
              <Ionicons name="checkmark-done" size={15} color={colors.primary} />
              <Text className="text-xs font-bold text-primary">Đọc tất cả</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row items-end border-b border-border">
          {FILTER_TABS.map((tab) => (
            <FilterTab
              key={tab.key}
              label={tab.label}
              count={tab.key === 'unread' ? unreadCount : undefined}
              isActive={filter === tab.key}
              onPress={() => setFilter(tab.key)}
            />
          ))}
        </View>
      </View>

      {errorMessage ? (
        <View className="mx-5 mb-3 rounded-2xl bg-red-50 px-3 py-2.5">
          <Text className="text-sm text-error">{errorMessage}</Text>
          <Pressable onPress={() => void refetch()} className="mt-2">
            <Text className="text-sm font-semibold text-primary">Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      <View
        className="mx-3 flex-1 overflow-hidden rounded-t-[28px] bg-white"
        style={CARD_SHADOW}
      >
        <SectionList
          sections={listEmpty ? [] : sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refetch()}
              tintColor={colors.primary}
            />
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.35}
          renderSectionHeader={({ section }: { section: NotificationSection }) => (
            <View className="bg-white px-4 pb-1 pt-4">
              <Text className="text-[13px] font-bold text-textPrimary">{section.title}</Text>
            </View>
          )}
          renderItem={({ item, section, index }) => (
            <NotificationListItem
              item={item}
              onPress={(n) => void handlePress(n)}
              showDivider={index < section.data.length - 1}
            />
          )}
          ListEmptyComponent={
            listEmpty ? (
              <View className="pt-2">
                <SkeletonRow />
                <View className="ml-[72px] h-px bg-border/70" />
                <SkeletonRow />
                <View className="ml-[72px] h-px bg-border/70" />
                <SkeletonRow />
              </View>
            ) : (
              <View className="items-center px-8 py-20">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-surface">
                  <Ionicons
                    name={filter === 'unread' ? 'checkmark-done-outline' : 'notifications-outline'}
                    size={30}
                    color={colors.textSecondary}
                  />
                </View>
                <Text className="mt-4 text-base font-semibold text-textPrimary">
                  {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo'}
                </Text>
                <Text className="mt-1.5 text-center text-sm leading-5 text-textSecondary">
                  {filter === 'unread'
                    ? 'Tất cả thông báo đã được đọc.'
                    : variant === 'citizen'
                      ? 'Cập nhật báo cáo, bình luận và thành tích sẽ hiện tại đây.'
                      : variant === 'staff'
                        ? 'Nhiệm vụ được giao và cảnh báo hệ thống sẽ hiện tại đây.'
                        : 'Hồ sơ thanh tra và cảnh báo SLA sẽ hiện tại đây.'}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View className="py-4">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={{ height: insets.bottom + 24 }} />
            )
          }
        />
      </View>
    </View>
  );
}
