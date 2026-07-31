import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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
import { useFieldWorkerLabels } from '@/hooks/useFieldWorkerLabels';
import { useTeamAccess } from '@/hooks/useTeamAccess';
import { colors } from '@/theme/colors';

const APP_VERSION = '1.0.0';
const SPRING = { damping: 18, stiffness: 280 };

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 3 },
}) as object;

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
  hideChevron?: boolean;
  /** Giá trị hiện ở cuối hàng (vd. số thành viên) */
  trailingText?: string;
}

function SettingRow({
  icon,
  label,
  description,
  onPress,
  destructive = false,
  busy = false,
  hideChevron = false,
  trailingText,
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

        {trailingText ? (
          <Text className="text-sm font-semibold text-textSecondary">{trailingText}</Text>
        ) : null}

        {busy ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : !hideChevron ? (
          <Ionicons name="chevron-forward" size={17} color={colors.textDisabled} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function SettingCard({ children }: { children: ReactNode }) {
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

/** Chip thông tin trên nền gradient — icon + nhãn đi cùng nhau. */
function InfoPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
    >
      <Ionicons name={icon} size={12} color={colors.white} />
      <Text className="text-xs font-semibold text-white">{label}</Text>
    </View>
  );
}

export default function StaffSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logoutAndRedirectToLogin } = useAuth();
  const labels = useFieldWorkerLabels();
  const { profile: team, isLeader, isLoading: isTeamLoading } = useTeamAccess();
  const [isLoggingOut, setLoggingOut] = useState(false);

  const memberCount = team?.members.length ?? 0;

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
    <View className="flex-1" style={{ backgroundColor: colors.surface }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* ── Header gradient ── */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: 44,
            paddingHorizontal: 20,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <Text className="mb-5 text-[22px] font-bold text-white">Cài đặt</Text>

          <View className="flex-row items-center gap-3">
            <View
              className="rounded-full"
              style={{ borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' }}
            >
              <UserAvatar
                name={user?.fullName ?? 'Nhân viên'}
                avatarUrl={user?.avatarUrl}
                size={56}
              />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="flex-1 text-base font-bold text-white" numberOfLines={1}>
                  {user?.fullName}
                </Text>
                {isLeader ? (
                  <View
                    className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
                    style={{ backgroundColor: 'rgba(255,255,255,0.24)' }}
                  >
                    <Ionicons name="star" size={9} color={colors.white} />
                    <Text className="text-[10px] font-bold text-white">Trưởng nhóm</Text>
                  </View>
                ) : null}
              </View>
              <Text
                className="mt-0.5 text-[13px]"
                style={{ color: 'rgba(255,255,255,0.85)' }}
                numberOfLines={1}
              >
                {user?.email}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <InfoPill icon="briefcase-outline" label={labels.roleBadge} />
            {team?.name || user?.teamName ? (
              <InfoPill icon="people" label={team?.name ?? user!.teamName!} />
            ) : (
              <InfoPill icon="time-outline" label="Chưa có nhóm" />
            )}
            {memberCount > 0 ? (
              <InfoPill icon="person-outline" label={`${memberCount} thành viên`} />
            ) : null}
          </View>
        </LinearGradient>

        <View style={{ marginTop: -26 }} className="px-4">
          {/* ── Nhóm ── */}
          <Animated.View entering={FadeIn.duration(260)}>
            <SettingCard>
              <SettingRow
                icon="people-outline"
                label={labels.teamSectionTitle}
                description={
                  isTeamLoading
                    ? 'Đang tải…'
                    : memberCount > 0
                      ? `${memberCount} thành viên trong nhóm`
                      : 'Chưa có thành viên'
                }
                trailingText={memberCount > 0 ? String(memberCount) : undefined}
                onPress={() => router.push('/members' as never)}
              />
            </SettingCard>
          </Animated.View>

          {/* ── Công việc ── */}
          <Animated.View entering={FadeInDown.delay(60).duration(280)} className="mt-6">
            <GroupLabel label="Công việc" />
            <SettingCard>
              <SettingRow
                icon="clipboard-outline"
                label={labels.taskListTitle}
                description="Danh sách việc được phân công"
                onPress={() => router.push('/assignments' as never)}
              />
              <SettingRow
                icon="trending-up-outline"
                label="Tiến độ"
                description="Theo dõi tiến độ xử lý"
                onPress={() => router.push('/progress' as never)}
              />
              <SettingRow
                icon="map-outline"
                label="Bản đồ nhiệm vụ"
                description="Xem vị trí các nhiệm vụ"
                onPress={() => router.push('/map' as never)}
              />
            </SettingCard>
          </Animated.View>

          {/* ── Tài khoản ── */}
          <Animated.View entering={FadeInDown.delay(120).duration(280)} className="mt-6">
            <GroupLabel label="Tài khoản" />
            <SettingCard>
              <SettingRow
                icon="notifications-outline"
                label="Thông báo"
                description="Cập nhật về nhiệm vụ của bạn"
                onPress={() => router.push('/notifications' as never)}
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

          <Animated.View entering={FadeIn.delay(240).duration(300)} className="mt-8 items-center">
            <Text className="text-[11px] text-textDisabled">GreenLens · {labels.shellTitle}</Text>
            <Text className="mt-0.5 text-[11px] text-textDisabled">Phiên bản {APP_VERSION}</Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
