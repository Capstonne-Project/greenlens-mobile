import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Children, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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
import { useInspectionKpi } from '@/hooks/useInspectionKpi';
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

interface StatCellProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  label: string;
}

/** Ô thống kê dạng số — icon trần không nền, chỉ đổi màu theo mức độ. */
function StatCell({ icon, iconColor, value, label }: StatCellProps) {
  return (
    <View className="flex-1 items-center gap-1 py-4">
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text className="text-lg font-bold text-textPrimary">{value}</Text>
      <Text className="text-center text-[11px] leading-3.5 text-textSecondary">{label}</Text>
    </View>
  );
}

const RING_SIZE = 46;
const RING_STROKE = 4;

/** Ô thống kê dạng mini donut — dùng cho chỉ số %, trực quan hơn số đơn thuần. */
function StatRing({
  percent,
  color,
  label,
}: {
  percent: number;
  color: string;
  label: string;
}) {
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <View className="flex-1 items-center gap-1 py-4">
      <View style={{ width: RING_SIZE, height: RING_SIZE }} className="items-center justify-center">
        <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            stroke={color}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <Text className="text-xs font-bold text-textPrimary">{Math.round(clamped)}%</Text>
      </View>
      <Text className="text-center text-[11px] leading-3.5 text-textSecondary">{label}</Text>
    </View>
  );
}

export default function InspectorProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logoutAndRedirectToLogin } = useAuth();
  const { kpi, isLoading: isKpiLoading } = useInspectionKpi('ThisMonth');
  const [isLoggingOut, setLoggingOut] = useState(false);

  const teamName = user?.teamName ?? kpi?.teamName;

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
          <Text className="mb-5 text-[22px] font-bold text-white">Cá nhân</Text>

          <View className="flex-row items-center gap-3">
            <View
              className="rounded-full"
              style={{ borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' }}
            >
              <UserAvatar name={user?.fullName ?? 'Inspector'} avatarUrl={user?.avatarUrl} size={56} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold text-white" numberOfLines={1}>
                {user?.fullName ?? 'Inspector'}
              </Text>
              {user?.email ? (
                <Text
                  className="mt-0.5 text-[13px]"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                  numberOfLines={1}
                >
                  {user.email}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <InfoPill icon="shield-checkmark-outline" label="Thanh tra viên" />
            {teamName ? (
              <InfoPill icon="people" label={teamName} />
            ) : (
              <InfoPill icon="time-outline" label="Chưa có đội" />
            )}
            {kpi ? <InfoPill icon="document-text-outline" label={`${kpi.totalInspections} hồ sơ tháng này`} /> : null}
          </View>
        </LinearGradient>

        <View style={{ marginTop: -26 }} className="px-4">
          {/* ── Hiệu suất tháng này ── */}
          <Animated.View entering={FadeIn.duration(260)}>
            <View className="overflow-hidden rounded-2xl bg-white" style={CARD_SHADOW}>
              <View className="flex-row items-center justify-between px-4 pt-3.5">
                <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
                  Hiệu suất tháng này
                </Text>
                {isKpiLoading ? <ActivityIndicator size="small" color={colors.textSecondary} /> : null}
              </View>

              {kpi ? (
                <>
                  <View className="flex-row">
                    <StatCell
                      icon="document-text-outline"
                      iconColor={colors.primary}
                      value={String(kpi.totalInspections)}
                      label="Tổng hồ sơ"
                    />
                    <View className="w-px bg-border" />
                    <StatRing
                      percent={kpi.penaltyIssuedOnTimePercent}
                      color={kpi.penaltyIssuedOnTimePercent >= 80 ? colors.primary : colors.warning}
                      label="Ban hành QĐ đúng hạn"
                    />
                    <View className="w-px bg-border" />
                    <StatRing
                      percent={kpi.paidOnTimePercent}
                      color={kpi.paidOnTimePercent >= 80 ? colors.primary : colors.warning}
                      label="Nộp phạt đúng hạn"
                    />
                  </View>
                  <View className="flex-row border-t border-border">
                    <StatCell
                      icon="refresh-circle-outline"
                      iconColor={kpi.repeatOffenderCount > 0 ? colors.warning : colors.textSecondary}
                      value={String(kpi.repeatOffenderCount)}
                      label="Đối tượng tái phạm"
                    />
                    <View className="w-px bg-border" />
                    <StatCell
                      icon="alert-circle-outline"
                      iconColor={kpi.slaBreach > 0 ? colors.error : colors.textSecondary}
                      value={String(kpi.slaBreach)}
                      label="Vi phạm SLA"
                    />
                    <View className="w-px bg-border" />
                    <StatCell
                      icon="checkmark-done-outline"
                      iconColor={colors.textSecondary}
                      value={String(kpi.closedNoViolationCount)}
                      label="Đóng không vi phạm"
                    />
                  </View>
                </>
              ) : !isKpiLoading ? (
                <View className="items-center px-6 py-8">
                  <Ionicons name="stats-chart-outline" size={28} color={colors.textDisabled} />
                  <Text className="mt-2 text-center text-xs text-textSecondary">
                    Chưa có số liệu tháng này.
                  </Text>
                </View>
              ) : (
                <View className="h-24" />
              )}
            </View>
          </Animated.View>

          {/* ── Hoạt động ── */}
          <Animated.View entering={FadeInDown.delay(60).duration(280)} className="mt-6">
            <GroupLabel label="Hoạt động" />
            <SettingCard>
              <SettingRow
                icon="document-text-outline"
                label="Hồ sơ đang xử lý"
                description="Danh sách hồ sơ được giao"
                onPress={() => router.push('/(inspector)/(tabs)/queue' as Href)}
              />
              <SettingRow
                icon="map-outline"
                label="Bản đồ hiện trường"
                description="Xem vị trí các hồ sơ trên bản đồ"
                onPress={() => router.push('/(inspector)/(tabs)/map' as Href)}
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
                description="Cập nhật về hồ sơ của bạn"
                onPress={() => router.push('/(inspector)/(tabs)/notifications' as Href)}
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
            <Text className="text-[11px] text-textDisabled">GreenLens · Thanh tra viên</Text>
            <Text className="mt-0.5 text-[11px] text-textDisabled">Phiên bản {APP_VERSION}</Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
