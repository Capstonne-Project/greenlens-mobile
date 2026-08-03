import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { Children, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserAvatar } from '@/components/common/UserAvatar';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme/colors';
import type { UserRole } from '@/types/user.types';

const APP_VERSION = '1.0.0';

const ROLE_LABEL: Record<UserRole, string> = {
  Citizen: 'Người dân',
  Cleaner: 'Nhân viên vệ sinh',
  CompanyStaff: 'Nhân viên công ty',
  Inspector: 'Thanh tra viên',
};

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 3 },
}) as object;

const SPRING = { damping: 18, stiffness: 280 };

/** Nhãn nhóm — phân tách các cụm cài đặt để mắt quét nhanh. */
function GroupLabel({ label }: { label: string }) {
  return (
    <Text className="mb-2 ml-1 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
      {label}
    </Text>
  );
}

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
  busy?: boolean;
  /** Ẩn mũi chevron khi hành động không mở màn mới */
  hideChevron?: boolean;
}

function SettingRow({
  icon,
  label,
  description,
  onPress,
  destructive = false,
  busy = false,
  hideChevron = false,
}: SettingRowProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const textColor = destructive ? colors.error : colors.textPrimary;
  const iconColor = destructive ? colors.error : colors.textSecondary;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        disabled={busy}
        onPressIn={() => {
          scale.value = withSpring(0.98, SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING);
        }}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        className="flex-row items-center gap-3.5 px-4 py-3.5"
        style={{ opacity: busy ? 0.5 : 1 }}
      >
        <Ionicons name={icon} size={21} color={iconColor} />

        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-medium" style={{ color: textColor }}>
            {label}
          </Text>
          {description ? (
            <Text className="mt-0.5 text-xs text-textSecondary">{description}</Text>
          ) : null}
        </View>

        {busy ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : !hideChevron ? (
          <Ionicons name="chevron-forward" size={17} color={colors.textDisabled} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/** Thẻ nhóm — bo góc, đổ bóng nhẹ, tự chèn separator giữa các hàng. */
function SettingCard({ children }: { children: ReactNode }) {
  // toArray bỏ null/false và gán key ổn định — an toàn với hàng render có điều kiện.
  const rows = Children.toArray(children);

  return (
    <View className="overflow-hidden rounded-2xl bg-white" style={CARD_SHADOW}>
      {rows.map((row, index) => (
        <View key={index}>
          {index > 0 ? (
            <View className="ml-[52px] h-px" style={{ backgroundColor: colors.border }} />
          ) : null}
          {row}
        </View>
      ))}
    </View>
  );
}

export default function CitizenSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logoutAndRedirectToLogin } = useAuth();
  const [isLoggingOut, setLoggingOut] = useState(false);

  const doLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutAndRedirectToLogin();
    } finally {
      setLoggingOut(false);
    }
  };

  const confirmLogout = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi tài khoản này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => void doLogout() },
    ]);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* ── Header ── */}
      <View className="flex-row items-center gap-1 px-2 pb-2 pt-1">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text className="text-xl font-bold text-textPrimary">Cài đặt</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Danh tính ── */}
        <Animated.View entering={FadeIn.duration(260)}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/edit-profile' as Href);
            }}
            className="mt-1 flex-row items-center gap-3.5 rounded-2xl bg-white px-4 py-4"
            style={CARD_SHADOW}
          >
            <UserAvatar name={user?.fullName ?? 'Người dùng'} avatarUrl={user?.avatarUrl} size={52} />
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold text-textPrimary" numberOfLines={1}>
                {user?.fullName ?? 'Người dùng'}
              </Text>
              <Text className="mt-0.5 text-xs text-textSecondary" numberOfLines={1}>
                {user?.email ?? (user?.role ? ROLE_LABEL[user.role] : '')}
              </Text>
              <Text className="mt-1.5 text-[11px] font-semibold text-primary">
                Chỉnh sửa hồ sơ
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.textDisabled} />
          </Pressable>
        </Animated.View>

        {/* ── Tài khoản ── */}
        <Animated.View entering={FadeInDown.delay(60).duration(280)} className="mt-6">
          <GroupLabel label="Tài khoản" />
          <SettingCard>
            <SettingRow
              icon="person-outline"
              label="Thông tin cá nhân"
              description="Tên, ảnh đại diện"
              onPress={() => router.push('/(tabs)/edit-profile' as Href)}
            />
            <SettingRow
              icon="lock-closed-outline"
              label="Đổi mật khẩu"
              description="Cập nhật mật khẩu đăng nhập"
              onPress={() => router.push('/(tabs)/change-password' as Href)}
            />
          </SettingCard>
        </Animated.View>

        {/* ── Hoạt động ── */}
        <Animated.View entering={FadeInDown.delay(120).duration(280)} className="mt-6">
          <GroupLabel label="Hoạt động" />
          <SettingCard>
            <SettingRow
              icon="notifications-outline"
              label="Thông báo"
              description="Xem thông báo về báo cáo của bạn"
              onPress={() => router.push('/(tabs)/notifications' as Href)}
            />
            <SettingRow
              icon="document-text-outline"
              label="Báo cáo của tôi"
              description="Lịch sử báo cáo đã gửi"
              onPress={() => router.push('/(tabs)/reports' as Href)}
            />
            <SettingRow
              icon="ribbon-outline"
              label="Huy hiệu"
              description="Thành tích đã mở khoá"
              onPress={() => router.push('/badges' as Href)}
            />
          </SettingCard>
        </Animated.View>

        {/* ── Phiên đăng nhập ── */}
        <Animated.View entering={FadeInDown.delay(180).duration(280)} className="mt-6">
          <GroupLabel label="Phiên đăng nhập" />
          <SettingCard>
            <SettingRow
              icon="log-out-outline"
              label="Đăng xuất"
              onPress={confirmLogout}
              destructive
              busy={isLoggingOut}
              hideChevron
            />
          </SettingCard>
        </Animated.View>

        {/* ── Version ── */}
        <Animated.View entering={FadeIn.delay(240).duration(300)} className="mt-8 items-center">
          <Text className="text-[11px] text-textDisabled">GreenLens</Text>
          <Text className="mt-0.5 text-[11px] text-textDisabled">Phiên bản {APP_VERSION}</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
