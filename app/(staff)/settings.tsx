import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { useFieldWorkerLabels } from '@/hooks/useFieldWorkerLabels';
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
  const iconBg = destructive ? '#FEF2F2' : colors.surface;
  const iconColor = destructive ? colors.error : colors.textSecondary;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 16, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 280 }); }}
        onPress={onPress}
        className="flex-row items-center gap-3 px-4 py-4"
      >
        <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text className="flex-1 text-base" style={{ color: textColor }}>{label}</Text>
        {!destructive && <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
      </Pressable>
    </Animated.View>
  );
}

function InfoPill({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
    >
      <Ionicons name={icon} size={12} color={colors.white} />
      <Text className="text-xs font-semibold text-white">{label}</Text>
    </View>
  );
}

export default function StaffSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const labels = useFieldWorkerLabels();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as Href);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface }}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 40,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <Text className="mb-5 text-[22px] font-bold text-white">Cài đặt</Text>

        <View className="flex-row items-center gap-3">
          <View
            className="h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
          >
            <Text className="text-xl font-bold text-white">{user?.fullName?.[0]?.toUpperCase() ?? 'C'}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-white" numberOfLines={1}>{user?.fullName}</Text>
            <Text className="text-[13px]" style={{ color: 'rgba(255,255,255,0.8)' }} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row flex-wrap gap-2">
          <InfoPill icon="briefcase-outline" label={labels.roleBadge} />
          {user?.teamName ? (
            <InfoPill icon="people" label={user.teamName} />
          ) : (
            <InfoPill icon="time-outline" label="Chưa có nhóm" />
          )}
        </View>
      </LinearGradient>

      <View style={{ marginTop: -24 }}>
        {/* Team members */}
        <View
          className="mx-4 mb-4 overflow-hidden rounded-2xl bg-white"
          style={{ elevation: 3, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 16 }}
        >
          <SettingRow
            icon="people-outline"
            label="Thành viên nhóm"
            onPress={() => router.push('/members' as never)}
          />
        </View>

        {/* Settings rows */}
        <View
          className="mx-4 overflow-hidden rounded-2xl bg-white"
          style={{ elevation: 3, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 16 }}
        >
          <View className="divide-y divide-border">
            <SettingRow
              icon="notifications-outline"
              label="Thông báo"
              onPress={() => router.push('/notifications' as never)}
            />
            <View className="h-px bg-border" />
            <SettingRow icon="lock-closed-outline" label="Đổi mật khẩu" onPress={() => {}} />
            <View className="h-px bg-border" />
            <SettingRow icon="information-circle-outline" label="Về ứng dụng" onPress={() => {}} />
          </View>
        </View>

        <View
          className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white"
          style={{ elevation: 3, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 16 }}
        >
          <SettingRow icon="log-out-outline" label="Đăng xuất" onPress={() => void handleLogout()} destructive />
        </View>
      </View>
    </View>
  );
}
