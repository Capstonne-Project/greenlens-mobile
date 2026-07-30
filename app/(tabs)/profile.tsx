import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { NotificationBell } from '@/components/common/NotificationBell';
import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { useMyReports } from '@/hooks/useMyReports';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';
import type { MyReportItem } from '@/types/my-reports.types';
import type { UserRole } from '@/types/user.types';
import { formatDate, formatRelativeTime } from '@/utils/formatters';
import { resolveMyReportDetailTarget } from '@/utils/report-merge';
import { getReportStatusMeta } from '@/utils/report-status';

const ROLE_LABEL: Record<UserRole, string> = {
  Citizen: 'Người dân tích cực bảo vệ môi trường',
  Cleaner: 'Nhân viên vệ sinh',
  CompanyStaff: 'Nhân viên công ty',
  Inspector: 'Thanh tra viên',
};

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  waste: 'trash-outline',
  water_pollution: 'water-outline',
  air_pollution: 'cloud-outline',
  noise: 'volume-high-outline',
  other: 'leaf-outline',
};

const CATEGORY_COLOR: Record<string, string> = {
  waste: colors.primary,
  water_pollution: colors.info,
  air_pollution: colors.error,
  noise: '#8B5CF6',
  other: colors.textSecondary,
};

/**
 * BE hiện chỉ trả `categoryName` (tiếng Việt) trên `/reports/my` — `categoryCode`
 * là field legacy thường rỗng, nên suy icon từ tên hiển thị thay vì code.
 */
function resolveActivityIcon(categoryName: string): keyof typeof Ionicons.glyphMap {
  const name = categoryName.toLowerCase();
  if (name.includes('nước')) return 'water-outline';
  if (name.includes('khí') || name.includes('khói') || name.includes('bụi')) return 'cloud-outline';
  if (name.includes('ồn') || name.includes('tiếng')) return 'volume-high-outline';
  if (name.includes('rác') || name.includes('chất thải')) return 'trash-outline';
  return 'leaf-outline';
}

/**
 * TODO(BE): mock tạm — `/users/me` hiện chưa trả field `links` (website, social, shop…).
 * Báo BE bổ sung `links: { label: string; url: string }[]` vào response user profile
 * để thay thế mảng mock này bằng dữ liệu thật.
 */
const MOCK_PROFILE_LINKS = [
  { icon: 'link-outline' as const, label: 'Trang cá nhân', url: 'greenlens.vn/profile' },
  { icon: 'logo-facebook' as const, label: 'Fanpage cộng đồng', url: 'facebook.com/greenlens' },
];

const CARD_3D_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  android: { elevation: 8 },
}) as object;

function IconButton({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.9, { damping: 16, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 280 }); }}
        hitSlop={8}
        className="h-9 w-9 items-center justify-center"
      >
        <Ionicons name={icon} size={20} color={colors.textPrimary} />
      </Pressable>
    </Animated.View>
  );
}

function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-lg font-bold text-textPrimary">{value}</Text>
      <Text className="mt-0.5 text-xs text-textSecondary">{label}</Text>
    </View>
  );
}

const BUBBLE_SHADOW = Platform.select({
  ios: {
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 6 },
}) as object;

/**
 * Bubble "flair" hiển thị huy hiệu người dùng ghim, nổi lên phía trên avatar.
 * Tự giãn theo độ dài tên huy hiệu — không cắt chữ.
 */
function FeaturedBadgeBubble({ name, onPress }: { name: string; onPress: () => void }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 260 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 220 });
    scale.value = withSpring(1, { damping: 15, stiffness: 220 });
  }, [opacity, translateY, scale, name]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle} className="mb-2 self-start">
      <TapScale onPress={onPress}>
        <View className="relative">
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 6,
              ...BUBBLE_SHADOW,
            }}
          >
            <Ionicons name="ribbon" size={13} color={colors.white} />
            <Text className="text-xs font-bold text-white">{name}</Text>
          </LinearGradient>

          {/* Mũi bubble trỏ xuống tâm avatar (avatar 80px, tâm ≈ 40) */}
          <View
            style={{
              position: 'absolute',
              bottom: -3,
              left: 34,
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: colors.primary,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      </TapScale>
    </Animated.View>
  );
}

/** Thẻ tổng quan huy hiệu — cuộn ngang để xem hết, huy hiệu đang ghim được tô sáng. */
function BadgeShowcaseCard({
  achievements,
  featuredName,
  onPress,
}: {
  achievements: string[];
  featuredName?: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mx-4 mt-4">
      <View className="overflow-hidden rounded-2xl bg-white" style={CARD_3D_SHADOW}>
        <View className="flex-row items-center gap-3 px-4 pt-3.5">
          <View
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: `${colors.primary}1A` }}
          >
            <Ionicons name="ribbon" size={18} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-textPrimary">Huy hiệu của tôi</Text>
            <Text className="mt-0.5 text-xs text-textSecondary">
              {achievements.length > 0
                ? `Đã đạt ${achievements.length} huy hiệu`
                : 'Chưa đạt huy hiệu nào'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>

        {achievements.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 8 }}
          >
            {achievements.map((name) => {
              const isFeatured = name === featuredName;
              return (
                <View
                  key={name}
                  className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                  style={{
                    backgroundColor: isFeatured ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: isFeatured ? colors.primary : colors.border,
                  }}
                >
                  <Ionicons
                    name={isFeatured ? 'star' : 'ribbon-outline'}
                    size={13}
                    color={isFeatured ? colors.white : colors.primary}
                  />
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: isFeatured ? colors.white : colors.textPrimary }}
                  >
                    {name}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View className="px-4 pb-4 pt-2">
            <Text className="text-xs text-textSecondary">
              Gửi báo cáo và tham gia dọn rác để mở khóa huy hiệu đầu tiên của bạn.
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function ReportThumb({
  item,
  onPress,
  onLongPress,
}: {
  item: MyReportItem;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const iconColor = CATEGORY_COLOR[item.categoryCode ?? 'other'] ?? colors.textSecondary;
  const icon = CATEGORY_ICON[item.categoryCode ?? 'other'] ?? 'help-circle';

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(1, { damping: 14, stiffness: 260 });
    onLongPress();
  };

  return (
    <View className="aspect-square w-[33.33%] p-[0.75px]">
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <Pressable
          onPress={onPress}
          onLongPress={handleLongPress}
          delayLongPress={280}
          onPressIn={() => { scale.value = withSpring(0.9, { damping: 14, stiffness: 260 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 260 }); }}
          className="flex-1"
        >
          <View className="flex-1 items-center justify-center" style={{ backgroundColor: `${iconColor}1A` }}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Ionicons name={icon} size={32} color={iconColor} />
            )}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * Nút tab hồ sơ — icon-only trước đây buộc người dùng phải đoán nội dung từng tab,
 * nên bổ sung nhãn chữ. Icon nảy nhẹ khi được chọn để phản hồi tức thì.
 */
function ProfileTabButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    scale.value = withSpring(active ? 1.12 : 1, { damping: 12, stiffness: 240 });
  }, [active, scale]);

  const tint = active ? colors.textPrimary : colors.textSecondary;

  return (
    <Pressable
      onPress={() => {
        if (!active) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className="flex-1 items-center gap-1 border-b-2 pb-2.5 pt-3"
      style={{ borderColor: active ? colors.textPrimary : 'transparent' }}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name={icon} size={21} color={tint} />
      </Animated.View>
      <Text
        className={`text-[11px] ${active ? 'font-bold' : 'font-medium'}`}
        style={{ color: tint }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Skeleton nhịp thở cho tab Hoạt động — khớp layout card thật (thumbnail 68px +
 * 3 dòng text + hàng chân) để không bị "nhảy" khi data về.
 */
function ListCardSkeleton({ index }: { index: number }) {
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withDelay(
      index * 120,
      withRepeat(withTiming(1, { duration: 720 }), -1, true),
    );
  }, [index, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View className="mb-3 rounded-2xl border border-border bg-white p-3.5">
      <Animated.View style={pulseStyle}>
        <View className="flex-row gap-3">
          <View className="h-[68px] w-[68px] rounded-[14px] bg-surface" />
          <View className="flex-1 justify-center">
            <View className="h-3.5 w-3/4 rounded bg-surface" />
            <View className="mt-2 h-3 w-1/2 rounded bg-surface" />
            <View className="mt-2 h-3 w-2/5 rounded bg-surface" />
          </View>
        </View>
        <View className="mt-3 h-3 w-full rounded bg-surface" />
      </Animated.View>
    </View>
  );
}

function ReportThumbSkeleton() {
  return (
    <View className="aspect-square w-[33.33%] p-[0.75px]">
      <View className="h-full w-full bg-surface" />
    </View>
  );
}

/** Câu mô tả trạng thái bằng ngôn ngữ người dùng — cho biết "giờ sao rồi, tôi cần làm gì". */
function activityHint(status: string): { icon: keyof typeof Ionicons.glyphMap; text: string } {
  if (status === 'Resolved' || status === 'PenaltyIssued') {
    return { icon: 'checkmark-circle', text: 'Đã xử lý xong — chờ bạn xác nhận' };
  }
  if (status === 'InProgress') return { icon: 'sync', text: 'Đội vệ sinh đang xử lý' };
  if (status === 'Verified' || status === 'Assigned' || status === 'Dispatched') {
    return { icon: 'shield-checkmark', text: 'Đã xác minh — đang chờ phân công' };
  }
  if (status === 'Submitted') return { icon: 'hourglass', text: 'Đang chờ xác minh' };
  if (status === 'Closed' || status === 'ClosedNoViolation') {
    return { icon: 'checkmark-done', text: 'Đã hoàn thành' };
  }
  if (status === 'Duplicate') return { icon: 'git-merge', text: 'Đã gộp vào báo cáo gốc' };
  if (status === 'Rejected') return { icon: 'close-circle', text: 'Không được tiếp nhận' };
  return { icon: 'information-circle', text: getReportStatusMeta(status).label };
}

function ActivityCard({ item, onPress }: { item: MyReportItem; onPress: () => void }) {
  const statusMeta = getReportStatusMeta(item.status);
  const icon = resolveActivityIcon(item.categoryName);
  const hint = activityHint(item.status);

  return (
    <TapScale onPress={onPress}>
      <View className="mb-3 rounded-2xl border border-border bg-white p-3.5">
        <View className="flex-row gap-3">
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: 68, height: 68, borderRadius: 14 }}
              contentFit="cover"
              transition={160}
            />
          ) : (
            <View className="h-[68px] w-[68px] items-center justify-center rounded-[14px] bg-surface">
              <Ionicons name={icon} size={26} color={colors.textDisabled} />
            </View>
          )}

          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name={icon} size={13} color={colors.textSecondary} />
              <Text className="flex-1 text-[15px] font-bold text-textPrimary" numberOfLines={1}>
                {item.categoryName}
              </Text>
            </View>

            <View className="mt-1 flex-row items-center gap-1">
              <Ionicons name="location-outline" size={12} color={colors.textDisabled} />
              <Text className="flex-1 text-xs text-textSecondary" numberOfLines={1}>
                {item.address}
              </Text>
            </View>

            <View className="mt-1.5 flex-row items-center gap-1.5">
              <Ionicons name={hint.icon} size={12} color={statusMeta.textColor} />
              <Text
                className="flex-1 text-[11px] font-medium"
                style={{ color: statusMeta.textColor }}
                numberOfLines={1}
              >
                {hint.text}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-3 flex-row items-center justify-between border-t border-border/70 pt-2.5">
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: statusMeta.bgColor }}>
              <Text className="text-[11px] font-semibold" style={{ color: statusMeta.textColor }}>
                {statusMeta.label}
              </Text>
            </View>
            <Text className="text-[11px] text-textDisabled" numberOfLines={1}>
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
        </View>
      </View>
    </TapScale>
  );
}

function LinksSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-30">
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View className="rounded-t-3xl bg-white px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <View className="mb-3 items-center">
          <View className="h-1 w-10 rounded-full bg-border" />
        </View>

        <Text className="mb-4 text-center text-base font-bold text-textPrimary">Liên kết</Text>

        {MOCK_PROFILE_LINKS.map((link) => (
          <TapScale key={link.url} onPress={() => Alert.alert(link.label, link.url)}>
            <View className="mb-2 flex-row items-center gap-3 rounded-xl bg-surface px-4 py-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                <Ionicons name={link.icon} size={18} color={colors.textPrimary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-textPrimary">{link.label}</Text>
                <Text className="text-xs text-textSecondary" numberOfLines={1}>{link.url}</Text>
              </View>
            </View>
          </TapScale>
        ))}

        <TapScale onPress={onClose} className="mt-2">
          <View className="h-11 items-center justify-center">
            <Text className="text-sm font-semibold text-textSecondary">Đóng</Text>
          </View>
        </TapScale>
      </View>
    </View>
  );
}

function ReportPreviewModal({
  item,
  onClose,
  onOpenDetail,
}: {
  item: MyReportItem | null;
  onClose: () => void;
  onOpenDetail: (item: MyReportItem) => void;
}) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (item) {
      scale.value = withSpring(1, { damping: 16, stiffness: 260 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = 0.85;
      opacity.value = 0;
    }
  }, [item, scale, opacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!item) return null;

  const statusMeta = getReportStatusMeta(item.status);
  const iconColor = CATEGORY_COLOR[item.categoryCode ?? 'other'] ?? colors.textSecondary;
  const icon = CATEGORY_ICON[item.categoryCode ?? 'other'] ?? 'help-circle';

  return (
    <View className="absolute inset-0 z-40 items-center justify-center px-6">
      <Animated.View style={[{ position: 'absolute', inset: 0 }, backdropStyle]}>
        <Pressable className="flex-1 bg-black/60" onPress={onClose} />
      </Animated.View>

      <Animated.View className="w-full overflow-hidden rounded-2xl bg-white" style={[CARD_3D_SHADOW, cardStyle]}>
        <Pressable onPress={() => onOpenDetail(item)}>
          <View className="flex-row items-center gap-2 border-b border-border px-4 py-3">
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: `${iconColor}1A` }}
            >
              <Ionicons name={icon} size={16} color={iconColor} />
            </View>
            <Text className="flex-1 text-sm font-bold text-textPrimary" numberOfLines={1}>
              {item.categoryName}
            </Text>
            <Text className="text-xs text-textSecondary">{item.code}</Text>
          </View>

          <View className="aspect-square w-full bg-surface">
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name={icon} size={56} color={iconColor} />
              </View>
            )}
          </View>

          <View className="gap-2 px-4 py-3.5">
            <View className="flex-row items-center justify-between">
              <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: statusMeta.bgColor }}>
                <Text className="text-[11px] font-semibold" style={{ color: statusMeta.textColor }}>
                  {statusMeta.label}
                </Text>
              </View>
              <Text className="text-xs text-textSecondary">{formatDate(item.createdAt)}</Text>
            </View>

            <View className="flex-row items-start gap-1.5">
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-sm text-textSecondary" numberOfLines={2}>
                {item.address}
              </Text>
            </View>

            {item.reporterCount ? (
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                <Text className="text-xs text-textSecondary">{item.reporterCount} người cùng báo cáo</Text>
              </View>
            ) : null}
          </View>
        </Pressable>

        <View className="flex-row border-t border-border">
          <TapScale onPress={onClose} className="flex-1">
            <View className="items-center py-3.5">
              <Text className="text-sm font-semibold text-textSecondary">Đóng</Text>
            </View>
          </TapScale>
          <View className="w-px bg-border" />
          <TapScale onPress={() => onOpenDetail(item)} className="flex-1">
            <View className="items-center py-3.5">
              <Text className="text-sm font-semibold text-primary">Xem chi tiết</Text>
            </View>
          </TapScale>
        </View>
      </Animated.View>

      <View style={{ height: insets.bottom }} />
    </View>
  );
}

export default function ProfileTabScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const { items, isLoading } = useMyReports({ filterKey: 'ALL', pageSize: 12 });
  const [tab, setTab] = useState<'grid' | 'activity'>('grid');
  const [linksOpen, setLinksOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<MyReportItem | null>(null);

  /** Đồng bộ lại hồ sơ mới nhất từ server mỗi lần vào tab — theo docs/mobile-get-profile-api.md */
  useFocusEffect(
    useCallback(() => {
      userService
        .getProfile()
        .then(({ data: envelope }) => setUser(envelope.data))
        .catch(() => {});
    }, [setUser]),
  );

  const roleLabel = user?.role ? ROLE_LABEL[user.role] : undefined;
  const achievements = user?.achievements ?? [];
  const resolvedCount = useMemo(() => items.filter((i) => i.resolvedAt).length, [items]);

  const openDetail = (itemOrId: MyReportItem | string) => {
    if (typeof itemOrId === 'string') {
      router.push({ pathname: '/report/[id]', params: { id: itemOrId, source: 'tab' } } as Href);
      return;
    }
    const target = resolveMyReportDetailTarget(itemOrId);
    const mergedThumb = itemOrId.imageUrl?.trim();
    router.push({
      pathname: '/report/[id]',
      params: {
        id: target.id,
        source: 'tab',
        ...(target.fromMergedReportId
          ? {
              fromMergedReportId: target.fromMergedReportId,
              ...(mergedThumb ? { fromMergedReportImageUrl: mergedThumb } : {}),
            }
          : {}),
      },
    } as Href);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4" style={{ paddingTop: insets.top + 12 }}>
        <Text className="text-lg font-bold text-textPrimary" numberOfLines={1}>
          {user?.fullName ?? 'Hồ sơ'}
        </Text>
        <View className="flex-row items-center gap-2">
          <NotificationBell size={20} />
          <IconButton icon="settings-outline" onPress={() => router.push('/(tabs)/settings' as Href)} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-4">
          {user?.featuredBadge ? (
            <FeaturedBadgeBubble
              name={user.featuredBadge.nameVi}
              onPress={() => router.push('/badges' as Href)}
            />
          ) : null}

          <View className="flex-row items-center">
            <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-surface">
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <Text className="text-3xl font-bold text-textPrimary">{user?.fullName?.[0]?.toUpperCase() ?? 'H'}</Text>
              )}
            </View>

            <View className="flex-1 flex-row">
              <StatItem value={items.length} label="Báo cáo" />
              <StatItem value={user?.points ?? 0} label="Điểm" />
              <StatItem value={resolvedCount} label="Đã xử lý" />
            </View>
          </View>
        </View>

        <View className="px-4 pt-3">
          <Text className="text-[15px] font-bold text-textPrimary" numberOfLines={1}>
            {user?.fullName ?? 'Người dùng'}
          </Text>
          <Text className="mt-0.5 text-sm text-textSecondary" numberOfLines={2}>
            {roleLabel}
          </Text>

          <TapScale onPress={() => setLinksOpen(true)}>
            <Text className="mt-1 text-sm font-semibold text-primary">
              {MOCK_PROFILE_LINKS[0]?.url}
              {MOCK_PROFILE_LINKS.length > 1 ? ` và ${MOCK_PROFILE_LINKS.length - 1} liên kết khác` : ''}
            </Text>
          </TapScale>
        </View>

        <BadgeShowcaseCard
          achievements={achievements}
          featuredName={user?.featuredBadge?.nameVi}
          onPress={() => router.push('/badges' as Href)}
        />

        <View className="px-4 pt-4">
          <TapScale onPress={() => router.push('/(tabs)/edit-profile' as Href)}>
            <View className="items-center rounded-xl border border-border py-3.5">
              <Text className="text-base font-semibold text-textPrimary">Chỉnh sửa hồ sơ</Text>
            </View>
          </TapScale>
        </View>

        <View className="mt-4 flex-row border-b border-border">
          <ProfileTabButton
            icon="grid-outline"
            label="Ảnh"
            active={tab === 'grid'}
            onPress={() => setTab('grid')}
          />
          <ProfileTabButton
            icon="time-outline"
            label="Hoạt động"
            active={tab === 'activity'}
            onPress={() => setTab('activity')}
          />
        </View>

        {/* key theo tab → remount + fade-in mỗi lần đổi, tránh cảm giác "nhảy" cứng */}
        <Animated.View key={tab} entering={FadeIn.duration(220)}>
        {tab === 'grid' ? (
          <View className="flex-row flex-wrap">
            {isLoading ? (
              Array.from({ length: 9 }).map((_, index) => <ReportThumbSkeleton key={`thumb-skeleton-${index}`} />)
            ) : items.length === 0 ? (
              <View className="w-full items-center px-6 py-16">
                <Ionicons name="images-outline" size={28} color={colors.textSecondary} />
                <Text className="mt-3 text-center text-sm text-textSecondary">
                  Chưa có báo cáo nào. Gửi báo cáo đầu tiên để bắt đầu xây dựng hồ sơ đóng góp của bạn.
                </Text>
              </View>
            ) : (
              items.map((item) => (
                <ReportThumb
                  key={item.id}
                  item={item}
                  onPress={() => openDetail(item.id)}
                  onLongPress={() => setPreviewItem(item)}
                />
              ))
            )}
          </View>
        ) : (
          <View className="px-4 pt-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-sm text-textSecondary">Báo cáo gần đây của bạn</Text>
              {items.length > 0 ? (
                <Text className="text-sm font-semibold text-textSecondary">{items.length} báo cáo</Text>
              ) : null}
            </View>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <ListCardSkeleton key={`activity-skeleton-${index}`} index={index} />
              ))
            ) : items.length === 0 ? (
              <View className="items-center px-6 py-14">
                <Ionicons name="document-text-outline" size={40} color={colors.textDisabled} />
                <Text className="mt-3 text-center text-[15px] font-semibold text-textPrimary">
                  Chưa có hoạt động nào
                </Text>
                <Text className="mt-1 text-center text-sm leading-5 text-textSecondary">
                  Gửi báo cáo đầu tiên để theo dõi tiến độ xử lý ngay tại đây.
                </Text>
              </View>
            ) : (
              items.map((item) => <ActivityCard key={item.id} item={item} onPress={() => openDetail(item)} />)
            )}
          </View>
        )}
        </Animated.View>
      </ScrollView>

      <LinksSheet visible={linksOpen} onClose={() => setLinksOpen(false)} />

      <ReportPreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onOpenDetail={(reportItem) => {
          setPreviewItem(null);
          openDetail(reportItem);
        }}
      />
    </View>
  );
}
