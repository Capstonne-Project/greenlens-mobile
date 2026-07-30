import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserAvatar } from '@/components/common/UserAvatar';
import { Text } from '@/components/ui/text';
import { usePublicUserProfile } from '@/hooks/usePublicUserProfile';
import { colors } from '@/theme/colors';
import type { PublicUserReportItem, UserRole } from '@/types/user.types';
import { formatDate } from '@/utils/formatters';

const ROLE_LABEL: Record<UserRole, string> = {
  Citizen: 'Người dân',
  Cleaner: 'Nhân viên vệ sinh',
  CompanyStaff: 'Nhân viên công ty',
  Inspector: 'Thanh tra viên',
};

/**
 * BE có thể trả `DateTime.MinValue` (0001-01-01) khi `CreatedAt` chưa được set —
 * không hiển thị "Tham gia 05/01/0001" cho người dùng.
 */
function resolveJoinedLabel(iso: string | undefined): string | null {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  if (new Date(iso).getFullYear() < 2000) return null;
  return formatDate(iso);
}

const CARD_3D_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 5 },
}) as object;

function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-lg font-bold text-textPrimary">{value}</Text>
      <Text className="mt-0.5 text-xs text-textSecondary">{label}</Text>
    </View>
  );
}

/**
 * Ô báo cáo trong lưới 3 cột — bấm để mở chi tiết.
 * Không hiện trạng thái xử lý: đó là việc giữa người gửi và bên xử lý,
 * người ngoài xem hồ sơ không cần thấy.
 */
function ReportThumb({ item, onPress }: { item: PublicUserReportItem; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View className="aspect-square w-1/3 p-[1px]">
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            scale.value = withSpring(0.93, { damping: 14, stiffness: 260 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          }}
          className="flex-1"
        >
          <View className="flex-1 items-center justify-center bg-surface">
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <Ionicons name="image-outline" size={26} color={colors.textSecondary} />
            )}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function ReportGridSkeleton() {
  return (
    <View className="flex-row flex-wrap">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={`grid-sk-${i}`} className="aspect-square w-1/3 p-[1px]">
          <View className="h-full w-full bg-surface" />
        </View>
      ))}
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View className="px-4 pt-4">
      <View className="items-center">
        <View className="h-20 w-20 rounded-full bg-surface" />
        <View className="mt-3 h-5 w-40 rounded bg-surface" />
        <View className="mt-2 h-3 w-24 rounded bg-border" />
      </View>
      <View className="mt-6 h-20 rounded-2xl bg-surface" />
      <View className="mt-4 h-24 rounded-2xl bg-surface" />
    </View>
  );
}

export default function PublicUserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const {
    profile,
    reports,
    isLoading,
    isLoadingReports,
    isLoadingMore,
    hasMore,
    errorMessage,
    refetch,
    loadMore,
  } = usePublicUserProfile(id);

  const joinedLabel = resolveJoinedLabel(profile?.joinedAt);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-2 px-2 py-2">
        <Pressable onPress={handleBack} hitSlop={8} className="h-10 w-10 items-center justify-center">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text className="text-base font-semibold text-textPrimary">Hồ sơ</Text>
      </View>

      {isLoading && !profile ? (
        <ProfileSkeleton />
      ) : errorMessage ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="person-circle-outline" size={48} color={colors.textSecondary} />
          <Text className="mt-3 text-center text-sm text-textSecondary">{errorMessage}</Text>
          <Pressable onPress={() => void refetch()} className="mt-4">
            <Text className="text-sm font-semibold text-primary">Thử lại</Text>
          </Pressable>
        </View>
      ) : profile ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          onScroll={({ nativeEvent: e }) => {
            const distanceToEnd =
              e.contentSize.height - e.contentOffset.y - e.layoutMeasurement.height;
            if (distanceToEnd < 320) void loadMore();
          }}
          scrollEventThrottle={200}
        >
          {/* ── Header ── */}
          <View className="items-center px-4 pt-2">
            <UserAvatar name={profile.fullName} avatarUrl={profile.avatarUrl} size={80} />

            <Text className="mt-3 text-xl font-bold text-textPrimary" numberOfLines={1}>
              {profile.fullName}
            </Text>
            <Text className="mt-0.5 text-xs text-textSecondary">
              {ROLE_LABEL[profile.role] ?? 'Thành viên'}
            </Text>

            {profile.featuredBadge ? (
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
                  marginTop: 10,
                }}
              >
                <Ionicons name="ribbon" size={13} color={colors.white} />
                <Text className="text-xs font-bold text-white">
                  {profile.featuredBadge.nameVi}
                </Text>
              </LinearGradient>
            ) : null}

            {joinedLabel ? (
              <Text className="mt-2 text-xs text-textSecondary">Tham gia {joinedLabel}</Text>
            ) : null}
          </View>

          {/* ── Stats ── */}
          <View
            className="mx-4 mt-5 flex-row rounded-2xl bg-white py-4"
            style={CARD_3D_SHADOW}
          >
            <StatItem value={profile.reportCount} label="Báo cáo" />
            <View className="w-px bg-border" />
            <StatItem value={profile.points ?? '—'} label="Điểm" />
            <View className="w-px bg-border" />
            <StatItem value={profile.rank ? `#${profile.rank}` : '—'} label="Hạng" />
          </View>

          {/* ── Badges ── */}
          <View className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white" style={CARD_3D_SHADOW}>
            <View className="flex-row items-center gap-3 px-4 pt-3.5">
              <Ionicons name="ribbon" size={18} color={colors.primary} />
              <View className="flex-1">
                <Text className="text-sm font-bold text-textPrimary">Huy hiệu</Text>
                <Text className="mt-0.5 text-xs text-textSecondary">
                  {profile.achievements.length > 0
                    ? `Đã đạt ${profile.achievements.length} huy hiệu`
                    : 'Chưa đạt huy hiệu nào'}
                </Text>
              </View>
            </View>

            {profile.achievements.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: 10,
                  paddingBottom: 14,
                  gap: 8,
                }}
              >
                {profile.achievements.map((name) => (
                  <View
                    key={name}
                    className="flex-row items-center gap-1.5 rounded-full bg-surface px-3 py-1.5"
                    style={{ borderWidth: 1, borderColor: colors.border }}
                  >
                    <Ionicons name="ribbon-outline" size={13} color={colors.primary} />
                    <Text className="text-xs font-semibold text-textPrimary">{name}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View className="px-4 pb-4 pt-2">
                <Text className="text-xs text-textSecondary">
                  Người dùng này chưa mở khóa huy hiệu nào.
                </Text>
              </View>
            )}
          </View>

          {/* ── Báo cáo đã đăng ── */}
          <View className="mt-6">
            <View className="mb-2 flex-row items-center gap-2 px-4">
              <Ionicons name="grid-outline" size={15} color={colors.textSecondary} />
              <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
                Báo cáo đã đăng
              </Text>
              {!isLoadingReports && reports.length > 0 ? (
                <Text className="text-xs text-textSecondary">{reports.length}</Text>
              ) : null}
            </View>

            {isLoadingReports ? (
              <ReportGridSkeleton />
            ) : reports.length === 0 ? (
              <View className="items-center px-8 py-8">
                <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
                <Text className="mt-2 text-center text-sm font-semibold text-textPrimary">
                  Chưa có báo cáo công khai
                </Text>
                <Text className="mt-1 text-center text-xs text-textSecondary">
                  Người dùng này chưa đăng báo cáo nào được hiển thị công khai.
                </Text>
              </View>
            ) : (
              <>
                <View className="flex-row flex-wrap">
                  {reports.map((item) => (
                    <ReportThumb
                      key={item.id}
                      item={item}
                      onPress={() =>
                        router.push({
                          pathname: '/report/[id]',
                          params: {
                            id: item.id,
                            source: 'tab',
                            ...(item.imageUrl ? { seedImageUrl: item.imageUrl } : {}),
                          },
                        } as Href)
                      }
                    />
                  ))}
                </View>

                {isLoadingMore ? (
                  <View className="py-4">
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : hasMore ? (
                  <Pressable onPress={() => void loadMore()} className="items-center py-4">
                    <Text className="text-sm font-semibold text-primary">Xem thêm</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}
