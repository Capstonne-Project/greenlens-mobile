import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { useMyReports } from '@/hooks/useMyReports';
import { colors } from '@/theme/colors';
import type { MyReportItem } from '@/types/my-reports.types';
import type { UserRole } from '@/types/user.types';
import { formatRelativeTime } from '@/utils/formatters';
import { getReportStatusMeta } from '@/utils/report-status';

const ROLE_LABEL: Record<UserRole, string> = {
  Citizen: 'Người dân tích cực bảo vệ môi trường',
  Cleaner: 'Nhân viên vệ sinh',
  CompanyStaff: 'Nhân viên công ty',
  Inspector: 'Thanh tra viên',
};

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
        className="h-9 w-9 items-center justify-center rounded-full bg-white/15"
      >
        <Ionicons name={icon} size={20} color={colors.white} />
      </Pressable>
    </Animated.View>
  );
}

function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-xl font-bold text-white">{value}</Text>
      <Text className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/70">{label}</Text>
    </View>
  );
}

function StatDivider() {
  return <View className="h-8 w-px bg-white/20" />;
}

function ActivityCardSkeleton() {
  return (
    <View
      className="mx-4 mb-4 rounded-xl bg-white p-4"
      style={CARD_3D_SHADOW}
    >
      <View className="h-3 w-16 rounded bg-surface" />
      <View className="mt-3 h-4 w-2/3 rounded bg-surface" />
      <View className="mt-2 h-3 w-1/2 rounded bg-surface" />
    </View>
  );
}

function ActivityCard({ item, onPress }: { item: MyReportItem; onPress: () => void }) {
  const statusMeta = getReportStatusMeta(item.status);

  return (
    <TapScale onPress={onPress}>
      <View
        className="mx-4 mb-4 overflow-hidden rounded-xl bg-white"
        style={CARD_3D_SHADOW}
      >
        <View
          className="flex-row items-center justify-between px-4 pt-3.5"
        >
          <Text className="text-xs text-textSecondary">{formatRelativeTime(item.createdAt)}</Text>
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: statusMeta.bgColor }}>
            <Text className="text-[10px] font-semibold" style={{ color: statusMeta.textColor }}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3 px-4 pb-4 pt-3">
          <View className="h-12 w-12 items-center justify-center rounded-lg bg-primaryLight">
            <Ionicons name="leaf-outline" size={22} color={colors.primary} />
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

export default function ProfileTabScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { items, isLoading } = useMyReports({ filterKey: 'ALL', pageSize: 5 });

  const roleLabel = user?.role ? ROLE_LABEL[user.role] : undefined;
  const openDetail = (reportId: string) => {
    router.push({ pathname: '/report/[id]', params: { id: reportId, source: 'tab' } } as Href);
  };

  return (
    <View className="flex-1 bg-surface">
      {/* Header xanh sticky — đứng yên, không cuộn theo nội dung bên dưới */}
      <View
        className="rounded-b-[32px] bg-primary px-4 pb-6"
        style={{ paddingTop: insets.top + 20 }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-white">Hồ sơ</Text>
          <IconButton icon="settings-outline" onPress={() => router.push('/(tabs)/change-password' as Href)} />
        </View>

        <View className="mt-5 items-center">
          <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/40 bg-white">
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Text className="text-4xl font-bold text-primary">{user?.fullName?.[0]?.toUpperCase() ?? 'H'}</Text>
            )}
          </View>
          <Text className="mt-3 text-2xl font-bold text-white" numberOfLines={1}>
            {user?.fullName ?? 'Người dùng'}
          </Text>
          <Text className="mt-1 text-sm text-white/80" numberOfLines={2}>
            {roleLabel}
          </Text>
        </View>

        <TapScale onPress={() => Alert.alert('Chỉnh sửa hồ sơ', 'Tính năng đang được phát triển.')}>
          <View className="mt-4 items-center rounded-full border border-white/50 py-2.5">
            <Text className="text-sm font-semibold text-white">Chỉnh sửa hồ sơ</Text>
          </View>
        </TapScale>

        <View className="mt-5 flex-row items-center rounded-2xl bg-white/10 py-3">
          <StatItem value={user?.reportCount ?? 0} label="Báo cáo" />
          <StatDivider />
          <StatItem value={user?.points ?? 0} label="Điểm" />
          <StatDivider />
          <StatItem value={items.filter((i) => i.resolvedAt).length} label="Đã xử lý" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mx-4 mb-1 text-sm font-semibold text-textSecondary">Hoạt động gần đây</Text>

        {isLoading ? (
          <View>
            {Array.from({ length: 3 }).map((_, index) => (
              <ActivityCardSkeleton key={`activity-skeleton-${index}`} />
            ))}
          </View>
        ) : items.length === 0 ? (
          <View className="mx-4 items-center rounded-xl bg-white px-6 py-10" style={CARD_3D_SHADOW}>
            <Ionicons name="document-text-outline" size={28} color={colors.textSecondary} />
            <Text className="mt-3 text-center text-sm text-textSecondary">
              Chưa có báo cáo nào. Gửi báo cáo đầu tiên để bắt đầu theo dõi hoạt động của bạn.
            </Text>
          </View>
        ) : (
          items.map((item) => <ActivityCard key={item.id} item={item} onPress={() => openDetail(item.id)} />)
        )}
      </ScrollView>
    </View>
  );
}
