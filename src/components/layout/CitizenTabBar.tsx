import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors } from '@/theme/colors';

const LEFT_TABS = ['index', 'reports'] as const;
const RIGHT_TABS = ['notifications', 'profile'] as const;

type TabName = (typeof LEFT_TABS)[number] | (typeof RIGHT_TABS)[number];

const TAB_META: Record<
  TabName,
  { label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }
> = {
  index: { label: 'Trang chủ', icon: 'home-outline', activeIcon: 'home' },
  reports: { label: 'Báo cáo', icon: 'file-tray-outline', activeIcon: 'file-tray' },
  notifications: { label: 'Thông báo', icon: 'notifications-outline', activeIcon: 'notifications' },
  profile: { label: 'Cá nhân', icon: 'person-outline', activeIcon: 'person' },
};

function FabPressable({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style} className="pointer-events-auto">
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.92, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
        className="h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ backgroundColor: colors.primary, shadowColor: colors.primary }}
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>
    </Animated.View>
  );
}

interface TabSlotProps extends BottomTabBarProps {
  routeName: TabName;
}

function TabSlot({ routeName, state, descriptors, navigation }: TabSlotProps) {
  const route = state.routes.find((r) => r.name === routeName);
  const meta = TAB_META[routeName];
  if (!route) return <View className="w-[52px]" />;

  const routeIndex = state.routes.findIndex((r) => r.key === route.key);
  const isFocused = state.index === routeIndex;
  const { options } = descriptors[route.key];
  const label = (options.title as string) ?? meta.label;

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name as never);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      className="min-w-[52px] items-center gap-0.5 py-1"
    >
      <Ionicons
        name={isFocused ? meta.activeIcon : meta.icon}
        size={24}
        color={isFocused ? colors.primary : colors.textSecondary}
      />
      <Text
        className="text-[11px] font-medium"
        style={{ color: isFocused ? colors.primary : colors.textSecondary }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function CitizenTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="border-t border-border bg-white" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
      <View className="relative px-2 pb-1 pt-2">
        <View className="flex-row items-end justify-between">
          <View className="flex-1 flex-row justify-evenly">
            {LEFT_TABS.map((name) => (
              <TabSlot key={name} {...props} routeName={name} />
            ))}
          </View>
          <View className="w-14" />
          <View className="flex-1 flex-row justify-evenly">
            {RIGHT_TABS.map((name) => (
              <TabSlot key={name} {...props} routeName={name} />
            ))}
          </View>
        </View>

        <View className="pointer-events-none absolute -top-8 left-0 right-0 items-center">
          <FabPressable onPress={() => router.push('/(tabs)/create' as Href)} />
        </View>
      </View>
    </View>
  );
}
