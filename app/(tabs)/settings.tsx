import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme/colors';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

function SettingRow({ icon, label, onPress, destructive = false }: SettingRowProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const textColor = destructive ? colors.error : colors.textPrimary;
  const iconColor = destructive ? colors.error : colors.textSecondary;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
        onPress={onPress}
        className="flex-row items-center gap-3 px-4 py-4"
      >
        <View className="h-9 w-9 items-center justify-center rounded-full bg-surface">
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text className="flex-1 text-base" style={{ color: textColor }}>
          {label}
        </Text>
        {!destructive && <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
      </Pressable>
    </Animated.View>
  );
}

export default function CitizenSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as Href);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-2 px-4 pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text className="text-xl font-bold text-textPrimary">Cài đặt</Text>
      </View>

      <View className="mx-4 overflow-hidden rounded-2xl bg-white shadow-sm" style={{ elevation: 2 }}>
        <SettingRow
          icon="lock-closed-outline"
          label="Đổi mật khẩu"
          onPress={() => router.push('/(tabs)/change-password' as Href)}
        />
        <View className="h-px bg-border" />
        <SettingRow icon="log-out-outline" label="Đăng xuất" onPress={() => void handleLogout()} destructive />
      </View>
    </View>
  );
}
