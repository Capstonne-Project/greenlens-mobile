import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { useMyReports } from '@/hooks/useMyReports';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';
import type { MyReportItem } from '@/types/my-reports.types';
import type { UserRole } from '@/types/user.types';
import { formatDate } from '@/utils/formatters';
import { getReportStatusMeta } from '@/utils/report-status';

const ROLE_LABEL: Record<UserRole, string> = {
  Citizen: 'Người dân tích cực bảo vệ môi trường',
  Cleaner: 'Nhân viên vệ sinh',
  CompanyStaff: 'Nhân viên công ty',
  Inspector: 'Thanh tra viên',
};

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  waste: 'trash',
  water_pollution: 'water',
  air_pollution: 'cloud',
  noise: 'volume-high',
  other: 'help-circle',
};

const CATEGORY_COLOR: Record<string, string> = {
  waste: colors.primary,
  water_pollution: colors.info,
  air_pollution: colors.error,
  noise: '#8B5CF6',
  other: colors.textSecondary,
};

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
        className="h-9 w-9 items-center justify-center rounded-full bg-surface"
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

function ReportThumbSkeleton() {
  return (
    <View className="aspect-square w-[33.33%] p-[0.75px]">
      <View className="h-full w-full bg-surface" />
    </View>
  );
}

function ActivityCard({ item, onPress }: { item: MyReportItem; onPress: () => void }) {
  const statusMeta = getReportStatusMeta(item.status);

  return (
    <TapScale onPress={onPress}>
      <View className="mb-3 overflow-hidden rounded-xl bg-white" style={CARD_3D_SHADOW}>
        <View className="flex-row items-center justify-between px-4 pt-3.5">
          <Text className="text-xs text-textSecondary">{item.code}</Text>
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: statusMeta.bgColor }}>
            <Text className="text-[10px] font-semibold" style={{ color: statusMeta.textColor }}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3 px-4 pb-4 pt-3">
          <View
            className="h-12 w-12 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${CATEGORY_COLOR[item.categoryCode ?? 'other'] ?? colors.textSecondary}1A` }}
          >
            <Ionicons
              name={CATEGORY_ICON[item.categoryCode ?? 'other'] ?? 'help-circle'}
              size={22}
              color={CATEGORY_COLOR[item.categoryCode ?? 'other'] ?? colors.textSecondary}
            />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-textPrimary" numberOfLines={1}>
              {item.categoryName}
            </Text>
            <View className="mt-1 flex-row items-center gap-1">
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text className="flex-1 text-xs text-textSecondary" numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-surface">
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </View>
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
  onOpenDetail: (reportId: string) => void;
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
        <Pressable onPress={() => onOpenDetail(item.id)}>
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
          <TapScale onPress={() => onOpenDetail(item.id)} className="flex-1">
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
  const resolvedCount = useMemo(() => items.filter((i) => i.resolvedAt).length, [items]);

  const openDetail = (reportId: string) => {
    router.push({ pathname: '/report/[id]', params: { id: reportId, source: 'tab' } } as Href);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4" style={{ paddingTop: insets.top + 12 }}>
        <Text className="text-lg font-bold text-textPrimary" numberOfLines={1}>
          {user?.fullName ?? 'Hồ sơ'}
        </Text>
        <View className="flex-row items-center gap-2">
          <IconButton icon="notifications-outline" onPress={() => router.push('/(tabs)/notifications' as Href)} />
          <IconButton icon="settings-outline" onPress={() => router.push('/(tabs)/settings' as Href)} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center px-4 pt-4">
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primaryLight">
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Text className="text-3xl font-bold text-primary">{user?.fullName?.[0]?.toUpperCase() ?? 'H'}</Text>
            )}
          </View>

          <View className="flex-1 flex-row">
            <StatItem value={items.length} label="Báo cáo" />
            <StatItem value={user?.points ?? 0} label="Điểm" />
            <StatItem value={resolvedCount} label="Đã xử lý" />
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

        <View className="px-4 pt-4">
          <TapScale onPress={() => router.push('/(tabs)/edit-profile' as Href)}>
            <View className="items-center rounded-xl border border-border py-3.5">
              <Text className="text-base font-semibold text-textPrimary">Chỉnh sửa hồ sơ</Text>
            </View>
          </TapScale>
        </View>

        <View className="mt-4 flex-row border-b border-border">
          <Pressable onPress={() => setTab('grid')} className="flex-1 items-center border-b-2 py-3" style={{ borderColor: tab === 'grid' ? colors.textPrimary : 'transparent' }}>
            <Ionicons name="grid-outline" size={22} color={tab === 'grid' ? colors.textPrimary : colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => setTab('activity')} className="flex-1 items-center border-b-2 py-3" style={{ borderColor: tab === 'activity' ? colors.textPrimary : 'transparent' }}>
            <Ionicons name="time-outline" size={22} color={tab === 'activity' ? colors.textPrimary : colors.textSecondary} />
          </Pressable>
        </View>

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
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <View key={`activity-skeleton-${index}`} className="mb-3 rounded-xl bg-surface p-4">
                  <View className="h-3 w-16 rounded bg-border" />
                  <View className="mt-3 h-4 w-2/3 rounded bg-border" />
                  <View className="mt-2 h-3 w-1/2 rounded bg-border" />
                </View>
              ))
            ) : items.length === 0 ? (
              <View className="items-center px-6 py-16">
                <Ionicons name="document-text-outline" size={28} color={colors.textSecondary} />
                <Text className="mt-3 text-center text-sm text-textSecondary">
                  Chưa có hoạt động nào gần đây.
                </Text>
              </View>
            ) : (
              items.map((item) => <ActivityCard key={item.id} item={item} onPress={() => openDetail(item.id)} />)
            )}
          </View>
        )}
      </ScrollView>

      <LinksSheet visible={linksOpen} onClose={() => setLinksOpen(false)} />

      <ReportPreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onOpenDetail={(reportId) => {
          setPreviewItem(null);
          openDetail(reportId);
        }}
      />
    </View>
  );
}
