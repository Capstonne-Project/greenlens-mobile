import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNotificationStore } from '@/stores/notification.store';
import { colors } from '@/theme/colors';

const TABS = ['queue', 'notifications', 'profile'] as const;

const TAB_META = {
  queue: { label: 'Hồ sơ', icon: 'document-text-outline', activeIcon: 'document-text' },
  notifications: { label: 'Thông báo', icon: 'notifications-outline', activeIcon: 'notifications' },
  profile: { label: 'Cá nhân', icon: 'person-outline', activeIcon: 'person' },
} as const;

export function InspectorTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <View className="border-t border-border bg-white" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
      <View className="flex-row justify-around px-2 pt-2">
        {state.routes.map((route, index) => {
          const name = route.name as (typeof TABS)[number];
          if (!TAB_META[name]) return null;
          const meta = TAB_META[name];
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label = (options.title as string) ?? meta.label;
          const showBadge = name === 'notifications' && unreadCount > 0;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              className="min-w-[80px] items-center gap-0.5 py-1"
            >
              <View className="relative">
                <Ionicons
                  name={isFocused ? meta.activeIcon : meta.icon}
                  size={24}
                  color={isFocused ? colors.primary : colors.textSecondary}
                />
                {showBadge ? (
                  <View
                    className="absolute -right-2.5 -top-1.5 min-w-[16px] items-center justify-center rounded-full border-2 border-white px-1"
                    style={{ height: 16, backgroundColor: colors.error }}
                  >
                    <Text className="text-[9px] font-bold leading-[10px] text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-[11px] font-medium" style={{ color: isFocused ? colors.primary : colors.textSecondary }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
